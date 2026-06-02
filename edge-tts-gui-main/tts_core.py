import asyncio
import os
import tempfile
import edge_tts
from pydub import AudioSegment

async def generate_audio(text, output_file, voice, rate, volume, pitch, split_length=2000):
    """
    Core function to generate audio from text using edge-tts.
    Handles text splitting and merging for long texts.
    """
    # Optimize for short text: skip splitting and ffmpeg merging
    if len(text) < split_length:
        communicate = edge_tts.Communicate(
            text, voice, rate=rate, volume=volume, pitch=pitch
        )
        await communicate.save(output_file)
        return

    # Split text into chunks of split_length characters
    chunks = [text[i:i + split_length] for i in range(0, len(text), split_length)]
    temp_files = []
    try:
        for idx, chunk in enumerate(chunks):
            # Create temp file, get name, and close it to avoid locking issues on Windows
            f = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            f.close()
            temp_files.append(f.name)
            
            communicate = edge_tts.Communicate(
                chunk, voice, rate=rate, volume=volume, pitch=pitch
            )
            await communicate.save(f.name)

        # Merge audio files
        if not temp_files:
            return

        combined = AudioSegment.empty()
        for temp_file in temp_files:
            combined += AudioSegment.from_file(temp_file)
        combined.export(output_file, format="mp3")
    finally:
        # Clean up temporary files
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except:
                    pass

async def get_voices():
    """Fetch available voices from edge-tts."""
    return await edge_tts.list_voices()
