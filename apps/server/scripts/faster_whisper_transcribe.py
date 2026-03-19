#!/usr/bin/env python3
import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description='Transcribe audio with faster-whisper')
    parser.add_argument('--audio-path', required=True)
    parser.add_argument('--model', default='base')
    parser.add_argument('--language', default='zh')
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--compute-type', default='int8')
    parser.add_argument('--beam-size', type=int, default=5)
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        print(f'faster-whisper import failed: {exc}', file=sys.stderr)
        return 2

    try:
        model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
        language = None if args.language == 'auto' else args.language
        segments, _info = model.transcribe(
            args.audio_path,
            language=language,
            beam_size=args.beam_size,
            vad_filter=True
        )
        text = ''.join(seg.text for seg in segments).strip()
        print(json.dumps({'text': text}, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(f'transcribe failed: {exc}', file=sys.stderr)
        return 3


if __name__ == '__main__':
    raise SystemExit(main())
