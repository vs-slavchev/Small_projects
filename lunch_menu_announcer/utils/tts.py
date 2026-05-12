"""Offline text-to-speech using Coqui XTTS v2 (voice cloning)."""

import logging
from pathlib import Path

log = logging.getLogger(__name__)


def generate_audio(
    text: str,
    speaker_wav: Path,
    output_path: Path,
    model_name: str,
    language: str,
) -> None:
    """Synthesize *text* in *language* using the voice from *speaker_wav*.

    The XTTS v2 model (~2 GB) is downloaded automatically on the first run
    and cached in ~/.local/share/tts/.
    """
    try:
        from TTS.api import TTS  # type: ignore[import]
    except ImportError:
        raise RuntimeError("Coqui TTS is not installed. Run: pip install TTS")

    log.info("Loading TTS model: %s", model_name)
    log.info("(First run will download ~2 GB — subsequent runs use the cache.)")

    tts = TTS(model_name=model_name)
    tts.tts_to_file(
        text=text,
        speaker_wav=str(speaker_wav),
        language=language,
        file_path=str(output_path),
    )
    log.info("Audio written to %s", output_path)
