import boto3
import json
import time
import os
import subprocess
from datetime import datetime
from pathlib import Path

# ===== CONFIGURARE =====
QUEUE_URL = 'https://sqs.eu-north-1.amazonaws.com/304182267357/music-processing-queue'
REGION = 'eu-north-1'
OUTPUT_BUCKET = 'app-partituri-eduard-test'
DYNAMODB_TABLE = 'Posts'

# ===== CLIENȚI AWS =====
sqs = boto3.client('sqs', region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)
dynamodb = boto3.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(DYNAMODB_TABLE)

# ===== DIRECTOARE LUCRU =====
WORK_DIR = '/tmp/oemer_processing'
os.makedirs(WORK_DIR, exist_ok=True)

print(f"🎵 Worker pornit. Astept mesaje de la SQS...")
print(f"📂 Director de lucru: {WORK_DIR}")

def download_from_s3(bucket, key, local_path):
    """Descarcă fișier din S3"""
    print(f"  📥 Descarc {key} din {bucket}...")
    s3.download_file(bucket, key, local_path)
    print(f"  ✅ Descărcat: {local_path}")

def process_with_oemer(input_image_path, output_dir):
    """Procesează partitura cu oemer"""
    print(f"  🎼 Procesez cu oemer (poate dura 10-15 minute)...")
    
    # Asigură-te că directorul output există
    os.makedirs(output_dir, exist_ok=True)
    
    # Forțează CPU mode (fără CUDA)
    env = os.environ.copy()
    env['CUDA_VISIBLE_DEVICES'] = '-1'
    
    # Rulează oemer ca subprocess
    cmd = [
        'oemer',
        input_image_path,
        '-o', output_dir,
        '--save-cache'
    ]
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=900,  # 15 minute timeout
        env=env
    )
    
    # Nu verificăm returncode - warnings CUDA sunt normale pe CPU
    if result.stderr:
        print(f"  ⚠️  Warnings (normale pe CPU): {result.stderr[:300]}...")
    
    print(f"  ✅ Procesare oemer completă!")
    return result.stdout

def generate_midi_from_musicxml(musicxml_path):
    """Generează MIDI din MusicXML"""
    try:
        print(f"  🎹 Generez MIDI din MusicXML...")
        from music21 import converter
        
        score = converter.parse(musicxml_path)
        midi_path = musicxml_path.replace('.musicxml', '.mid')
        score.write('midi', fp=midi_path)
        
        print(f"  ✅ MIDI generat: {Path(midi_path).name}")
        return midi_path
    except ImportError:
        print(f"  ⚠️  music21 nu e instalat - MIDI nu se va genera")
        print(f"     Rulează: pip install music21")
        return None
    except Exception as e:
        print(f"  ⚠️  Eroare la generare MIDI: {e}")
        return None

def generate_mp3_from_midi(midi_path):
    """Generează MP3 din MIDI folosind FluidSynth + FFmpeg"""
    try:
        print(f"  🎧 Generez MP3 din MIDI...")
        
        wav_path = midi_path.replace('.mid', '_temp.wav')
        mp3_path = midi_path.replace('.mid', '.mp3')
        
        # Step 1: MIDI → WAV cu FluidSynth
        fluidsynth_cmd = [
            'fluidsynth',
            '-ni',  # non-interactive
            '-g', '1.0',  # gain
            '-F', wav_path,  # output WAV
            '-r', '44100',  # sample rate
            '/usr/share/sounds/sf2/FluidR3_GM.sf2',  # soundfont
            midi_path
        ]
        
        result = subprocess.run(
            fluidsynth_cmd,
            capture_output=True,
            timeout=120  # 2 minute timeout
        )
        
        if result.returncode != 0:
            print(f"  ⚠️  FluidSynth failed: {result.stderr.decode()[:200]}")
            return None
        
        # Step 2: WAV → MP3 cu FFmpeg
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', wav_path,
            '-codec:a', 'libmp3lame',
            '-b:a', '192k',  # bitrate
            '-y',  # overwrite
            mp3_path
        ]
        
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            timeout=60
        )
        
        # Cleanup WAV temporar
        if Path(wav_path).exists():
            Path(wav_path).unlink()
        
        if result.returncode != 0:
            print(f"  ⚠️  FFmpeg failed: {result.stderr.decode()[:200]}")
            return None
        
        print(f"  ✅ MP3 generat: {Path(mp3_path).name}")
        return mp3_path
        
    except FileNotFoundError as e:
        print(f"  ⚠️  FluidSynth sau FFmpeg nu sunt instalate")
        print(f"     Rulează: sudo apt install fluidsynth fluid-soundfont-gm ffmpeg")
        return None
    except subprocess.TimeoutExpired:
        print(f"  ⚠️  Timeout la generare MP3")
        return None
    except Exception as e:
        print(f"  ⚠️  Eroare la generare MP3: {e}")
        return None

def upload_to_s3(local_path, bucket, key):
    """Încarcă fișier în S3"""
    print(f"  📤 Încarc {key} în {bucket}...")
    s3.upload_file(local_path, bucket, key)
    print(f"  ✅ Încărcat: s3://{bucket}/{key}")
    return f"s3://{bucket}/{key}"

def update_post_status(post_id, status, musicxml_url=None, midi_url=None, mp3_url=None):
    """Actualizează statusul postării în DynamoDB"""
    print(f"  💾 Actualizez DynamoDB: postId={post_id}, status={status}")
    
    update_expr = "SET #status = :status, updatedAt = :timestamp"
    expr_attr_names = {"#status": "status"}
    expr_attr_values = {
        ":status": status,
        ":timestamp": datetime.now().isoformat()
    }
    
    if musicxml_url:
        update_expr += ", musicxmlUrl = :musicxml"
        expr_attr_values[":musicxml"] = musicxml_url
    
    if midi_url:
        update_expr += ", midiUrl = :midi"
        expr_attr_values[":midi"] = midi_url
    
    if mp3_url:
        update_expr += ", mp3Url = :mp3"
        expr_attr_values[":mp3"] = mp3_url
    
    table.update_item(
        Key={'postId': post_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )
    print(f"  ✅ DynamoDB actualizat!")

def cleanup(directory):
    """Curăță fișierele temporare"""
    print(f"  🧹 Curăț directorul {directory}...")
    for file in os.listdir(directory):
        file_path = os.path.join(directory, file)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                import shutil
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"  ⚠️  Eroare la ștergere {file_path}: {e}")

# ===== MAIN LOOP =====
while True:
    response = sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=20
    )
    
    if 'Messages' in response:
        for msg in response['Messages']:
            print("\n" + "="*60)
            print(f"📨 MESAJ PRIMIT la {datetime.now().strftime('%H:%M:%S')}")
            print("="*60)
            
            post_id = 'unknown'  # Inițializare pentru except block
            
            try:
                # Parse mesajul
                body = json.loads(msg['Body'])
                
                # Verifică dacă e eveniment S3
                if 'Records' not in body:
                    print("⚠️  Mesaj ignorat (nu e de la S3)")
                    sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg['ReceiptHandle'])
                    continue
                
                # Extrage informații S3
                record = body['Records'][0]
                bucket = record['s3']['bucket']['name']
                key = record['s3']['object']['key']
                
                print(f"📁 Bucket: {bucket}")
                print(f"🖼️  Key: {key}")
                
                # Extrage postId din key (format: uploads/{postId}/image.jpg)
                parts = key.split('/')
                if len(parts) >= 2 and parts[0] == 'uploads':
                    post_id = parts[1]
                else:
                    post_id = 'unknown'
                
                print(f"🆔 Post ID: {post_id}")
                
                # Verifică extensia fișierului
                valid_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
                if not any(key.lower().endswith(ext) for ext in valid_extensions):
                    print(f"  ⚠️  Nu e imagine validă - ignorat (extensie nepermisă)")
                    sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg['ReceiptHandle'])
                    continue
                
                # Verifică dimensiunea (evită foldere goale)
                try:
                    head_response = s3.head_object(Bucket=bucket, Key=key)
                    file_size = head_response['ContentLength']
                    if file_size == 0:
                        print(f"  ⚠️  Fișier gol (folder) - ignorat")
                        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg['ReceiptHandle'])
                        continue
                    print(f"  📊 Dimensiune fișier: {file_size / 1024:.1f} KB")
                except Exception as e:
                    print(f"  ⚠️  Eroare la verificare fișier: {e}")
                    # Continuă oricum - poate fi o problemă temporară
                
                # Actualizează status: Processing
                update_post_status(post_id, 'processing')
                
                # Definește paths
                local_image = os.path.join(WORK_DIR, 'input.jpg')
                output_dir = os.path.join(WORK_DIR, 'output')
                
                # 1. Descarcă imaginea
                download_from_s3(bucket, key, local_image)
                
                # 2. Procesează cu oemer
                process_with_oemer(local_image, output_dir)
                
                # 3. Găsește fișierul MusicXML generat
                musicxml_files = [f for f in os.listdir(output_dir) if f.endswith('.musicxml')]
                
                if not musicxml_files:
                    raise Exception("Nu s-a generat niciun fișier MusicXML!")
                
                musicxml_file = os.path.join(output_dir, musicxml_files[0])
                print(f"  📄 Fișier MusicXML găsit: {musicxml_files[0]}")
                
                # 4. Generează MIDI din MusicXML
                midi_file = generate_midi_from_musicxml(musicxml_file)
                
                # 5. Generează MP3 din MIDI
                mp3_file = None
                if midi_file and Path(midi_file).exists():
                    mp3_file = generate_mp3_from_midi(midi_file)
                
                # 6. Încarcă toate fișierele în S3
                print(f"\n  📦 Încărcare fișiere în S3...")
                
                # MusicXML (obligatoriu)
                musicxml_key = f"processed/{post_id}/score.musicxml"
                musicxml_url = upload_to_s3(musicxml_file, OUTPUT_BUCKET, musicxml_key)
                
                # MIDI (opțional)
                midi_url = None
                if midi_file and Path(midi_file).exists():
                    midi_key = f"processed/{post_id}/audio.mid"
                    midi_url = upload_to_s3(midi_file, OUTPUT_BUCKET, midi_key)
                
                # MP3 (opțional)
                mp3_url = None
                if mp3_file and Path(mp3_file).exists():
                    mp3_key = f"processed/{post_id}/audio.mp3"
                    mp3_url = upload_to_s3(mp3_file, OUTPUT_BUCKET, mp3_key)
                
                # 7. Actualizează status: Completed
                update_post_status(post_id, 'completed', musicxml_url, midi_url, mp3_url)
                
                # 8. Curăță fișierele temporare
                cleanup(WORK_DIR)
                
                # Summary
                print(f"\n✅ PROCESARE COMPLETĂ CU SUCCES!")
                print(f"   📄 MusicXML: {musicxml_url}")
                if midi_url:
                    print(f"   🎹 MIDI: {midi_url}")
                if mp3_url:
                    print(f"   🎧 MP3: {mp3_url}")
                
            except subprocess.TimeoutExpired:
                print("❌ TIMEOUT: procesarea a durat prea mult (>15 min)")
                try:
                    update_post_status(post_id, 'failed')
                except:
                    pass
                
            except Exception as e:
                print(f"❌ EROARE: {e}")
                import traceback
                traceback.print_exc()
                
                # Marchează ca failed în DB
                try:
                    update_post_status(post_id, 'failed')
                except:
                    print("⚠️  Nu am putut actualiza statusul în DynamoDB")
            
            finally:
                # Șterge mesajul din SQS oricum
                sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg['ReceiptHandle'])
                print("🗑️  Mesaj șters din SQS")
                print("="*60 + "\n")
    
    else:
        # Niciun mesaj - arată că e alive
        print(".", end="", flush=True)
        time.sleep(1)
