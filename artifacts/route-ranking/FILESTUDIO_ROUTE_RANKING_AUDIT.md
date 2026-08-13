# FileStudio — Route Ranking Audit

Generated: 2026-08-13T03:04:53.882Z (linux, full desktop toolchain)

- Reachable pairs: 407
- Multi-route pairs: 358
- Changed winners vs legacy heuristic: 38
- Winners scoring not-recommended: 2

## Changed winners (legacy → ranked)

| Pair | Legacy choice | Ranked choice | Score | Reasons |
| --- | --- | --- | --- | --- |
| avi→pdf | avi→gif→jpg→pdf | avi→gif→png→pdf | 0.547 | DETERMINISTIC_TIEBREAK |
| avif→docx | avif→jpg→pdf→docx | avif→png→pdf→docx | 0.62 | DETERMINISTIC_TIEBREAK |
| avif→pdf | avif→jpg→pdf | avif→png→pdf | 0.791 | DETERMINISTIC_TIEBREAK |
| avif→txt | avif→jpg→pdf→txt | avif→png→pdf→txt | 0.598 | DETERMINISTIC_TIEBREAK |
| avif→html | avif→jpg→pdf→html | avif→png→pdf→html | 0.632 | DETERMINISTIC_TIEBREAK |
| doc→txt | doc→pdf→txt | doc→docx→txt | 0.686 | SHORTER_EQUIVALENT_ROUTE |
| doc→html | doc→pdf→html | doc→docx→html | 0.659 | SHORTER_EQUIVALENT_ROUTE |
| docx→txt | docx→pdf→txt | docx→txt | 0.686 | SHORTER_EQUIVALENT_ROUTE |
| gif→docx | gif→jpg→pdf→docx | gif→png→pdf→docx | 0.62 | DETERMINISTIC_TIEBREAK |
| gif→pdf | gif→jpg→pdf | gif→png→pdf | 0.791 | DETERMINISTIC_TIEBREAK |
| gif→txt | gif→jpg→pdf→txt | gif→png→pdf→txt | 0.598 | DETERMINISTIC_TIEBREAK |
| gif→html | gif→jpg→pdf→html | gif→png→pdf→html | 0.632 | DETERMINISTIC_TIEBREAK |
| md→epub | md→html→epub | md→docx→epub | 0.716 | SHORTER_EQUIVALENT_ROUTE |
| md→mobi | md→html→epub→mobi | md→docx→epub→mobi | 0.688 | HIGHER_FIDELITY, AVOIDS_IRREVERSIBLE_LOSS |
| md→azw3 | md→html→epub→azw3 | md→docx→epub→azw3 | 0.688 | HIGHER_FIDELITY, AVOIDS_IRREVERSIBLE_LOSS |
| mkv→pdf | mkv→gif→jpg→pdf | mkv→gif→png→pdf | 0.547 | DETERMINISTIC_TIEBREAK |
| mov→pdf | mov→gif→jpg→pdf | mov→gif→png→pdf | 0.547 | DETERMINISTIC_TIEBREAK |
| mp4→pdf | mp4→gif→jpg→pdf | mp4→gif→png→pdf | 0.547 | DETERMINISTIC_TIEBREAK |
| odt→txt | odt→pdf→txt | odt→docx→txt | 0.686 | SHORTER_EQUIVALENT_ROUTE |
| odt→html | odt→pdf→html | odt→docx→html | 0.659 | SHORTER_EQUIVALENT_ROUTE |
| rst→docx | rst→docx | rst→html→docx | 0.711 | SHORTER_EQUIVALENT_ROUTE, LOWER_RUNTIME_COST |
| rst→odt | rst→odt | rst→html→odt | 0.711 | SHORTER_EQUIVALENT_ROUTE, LOWER_RUNTIME_COST |
| rst→rtf | rst→docx→rtf | rst→html→docx→rtf | 0.711 | DETERMINISTIC_TIEBREAK |
| rst→pdf | rst→docx→pdf | rst→html→docx→pdf | 0.679 | DETERMINISTIC_TIEBREAK |
| rst→epub | rst→html→epub | rst→docx→epub | 0.701 | SHORTER_EQUIVALENT_ROUTE |
| rtf→txt | rtf→pdf→txt | rtf→docx→txt | 0.686 | SHORTER_EQUIVALENT_ROUTE |
| rtf→html | rtf→pdf→html | rtf→docx→html | 0.659 | SHORTER_EQUIVALENT_ROUTE |
| tex→docx | tex→md→docx | tex→html→docx | 0.679 | DETERMINISTIC_TIEBREAK |
| tex→odt | tex→md→odt | tex→html→odt | 0.679 | DETERMINISTIC_TIEBREAK |
| tex→rtf | tex→md→docx→rtf | tex→html→docx→rtf | 0.679 | DETERMINISTIC_TIEBREAK |
| tex→pdf | tex→md→docx→pdf | tex→html→docx→pdf | 0.649 | DETERMINISTIC_TIEBREAK |
| tex→epub | tex→html→epub | tex→html→docx→epub | 0.701 | DETERMINISTIC_TIEBREAK |
| tex→txt | tex→md→txt | tex→html→txt | 0.686 | DETERMINISTIC_TIEBREAK |
| tex→rst | tex→md→rst | tex→html→rst | 0.679 | DETERMINISTIC_TIEBREAK |
| ts→pdf | ts→gif→jpg→pdf | ts→gif→png→pdf | 0.547 | DETERMINISTIC_TIEBREAK |
| txt→epub | txt→html→epub | txt→html→docx→epub | 0.613 | DETERMINISTIC_TIEBREAK |
| webm→pdf | webm→gif→jpg→pdf | webm→gif→png→pdf | 0.547 | DETERMINISTIC_TIEBREAK |
| wmv→pdf | wmv→gif→jpg→pdf | wmv→gif→png→pdf | 0.547 | DETERMINISTIC_TIEBREAK |

## All multi-route pairs

| Pair | Routes | Legacy | Ranked | Band | Changed |
| --- | --- | --- | --- | --- | --- |
| 7z→zip | 2 | 7z→zip | 7z→zip | excellent | no |
| 7z→tar | 2 | 7z→tar | 7z→tar | excellent | no |
| aac→mp3 | 17 | aac→mp3 | aac→mp3 | good | no |
| aac→m4a | 17 | aac→m4a | aac→m4a | good | no |
| aac→wav | 17 | aac→wav | aac→wav | excellent | no |
| aac→flac | 17 | aac→flac | aac→flac | excellent | no |
| aac→ogg | 17 | aac→ogg | aac→ogg | good | no |
| avi→mp3 | 50 | avi→mp3 | avi→mp3 | good | no |
| avi→m4a | 50 | avi→m4a | avi→m4a | good | no |
| avi→wav | 50 | avi→wav | avi→wav | good | no |
| avi→flac | 50 | avi→flac | avi→flac | good | no |
| avi→ogg | 50 | avi→ogg | avi→ogg | good | no |
| avi→aac | 50 | avi→aac | avi→aac | good | no |
| avi→mp4 | 5 | avi→mp4 | avi→mp4 | good | no |
| avi→webm | 5 | avi→webm | avi→webm | good | no |
| avi→mkv | 5 | avi→mkv | avi→mkv | excellent | no |
| avi→png | 8 | avi→gif→png | avi→gif→png | format-loss | no |
| avi→webp | 8 | avi→gif→webp | avi→gif→webp | format-loss | no |
| avi→avif | 8 | avi→gif→avif | avi→gif→avif | format-loss | no |
| avi→tiff | 8 | avi→gif→tiff | avi→gif→tiff | format-loss | no |
| avi→gif | 10 | avi→gif | avi→gif | format-loss | no |
| avi→pdf | 4 | avi→gif→jpg→pdf | avi→gif→png→pdf | format-loss | YES |
| avif→png | 20 | avif→png | avif→png | good | no |
| avif→webp | 17 | avif→webp | avif→webp | good | no |
| avif→tiff | 20 | avif→tiff | avif→tiff | good | no |
| avif→gif | 17 | avif→gif | avif→gif | format-loss | no |
| avif→docx | 4 | avif→jpg→pdf→docx | avif→png→pdf→docx | format-loss | YES |
| avif→pdf | 20 | avif→jpg→pdf | avif→png→pdf | good | YES |
| avif→txt | 4 | avif→jpg→pdf→txt | avif→png→pdf→txt | format-loss | YES |
| avif→html | 4 | avif→jpg→pdf→html | avif→png→pdf→html | format-loss | YES |
| bz2→zip | 5 | bz2→zip | bz2→zip | excellent | no |
| bz2→7z | 5 | bz2→7z | bz2→7z | excellent | no |
| bz2→tar | 5 | bz2→tar | bz2→tar | excellent | no |
| csv→json | 17 | csv→json | csv→json | good | no |
| csv→yaml | 17 | csv→yaml | csv→yaml | good | no |
| csv→toml | 17 | csv→toml | csv→toml | good | no |
| csv→xml | 17 | csv→xml | csv→xml | good | no |
| csv→tsv | 17 | csv→tsv | csv→tsv | good | no |
| doc→png | 5 | doc→pdf→png | doc→pdf→png | good | no |
| doc→tiff | 5 | doc→pdf→tiff | doc→pdf→tiff | good | no |
| doc→docx | 8 | doc→docx | doc→docx | excellent | no |
| doc→odt | 10 | doc→odt | doc→odt | excellent | no |
| doc→rtf | 6 | doc→rtf | doc→rtf | good | no |
| doc→pdf | 12 | doc→pdf | doc→pdf | excellent | no |
| doc→epub | 4 | doc→docx→epub | doc→docx→epub | good | no |
| doc→txt | 10 | doc→pdf→txt | doc→docx→txt | good | YES |
| doc→html | 10 | doc→pdf→html | doc→docx→html | good | YES |
| doc→rst | 5 | doc→docx→rst | doc→docx→rst | good | no |
| doc→tex | 2 | doc→docx→md→tex | doc→docx→md→tex | good | no |
| docx→png | 9 | docx→pdf→png | docx→pdf→png | good | no |
| docx→tiff | 9 | docx→pdf→tiff | docx→pdf→tiff | good | no |
| docx→odt | 14 | docx→odt | docx→odt | excellent | no |
| docx→rtf | 6 | docx→rtf | docx→rtf | good | no |
| docx→pdf | 12 | docx→pdf | docx→pdf | excellent | no |
| docx→epub | 5 | docx→epub | docx→epub | good | no |
| docx→mobi | 2 | docx→epub→mobi | docx→epub→mobi | good | no |
| docx→azw3 | 2 | docx→epub→azw3 | docx→epub→azw3 | good | no |
| docx→txt | 15 | docx→pdf→txt | docx→txt | good | YES |
| docx→html | 16 | docx→html | docx→html | good | no |
| docx→rst | 7 | docx→rst | docx→rst | good | no |
| docx→tex | 7 | docx→md→tex | docx→md→tex | good | no |
| flac→mp3 | 17 | flac→mp3 | flac→mp3 | good | no |
| flac→m4a | 17 | flac→m4a | flac→m4a | good | no |
| flac→wav | 17 | flac→wav | flac→wav | excellent | no |
| flac→ogg | 17 | flac→ogg | flac→ogg | good | no |
| flac→aac | 17 | flac→aac | flac→aac | good | no |
| gif→png | 20 | gif→png | gif→png | good | no |
| gif→webp | 17 | gif→webp | gif→webp | good | no |
| gif→avif | 17 | gif→avif | gif→avif | good | no |
| gif→tiff | 20 | gif→tiff | gif→tiff | good | no |
| gif→docx | 4 | gif→jpg→pdf→docx | gif→png→pdf→docx | format-loss | YES |
| gif→pdf | 20 | gif→jpg→pdf | gif→png→pdf | good | YES |
| gif→txt | 4 | gif→jpg→pdf→txt | gif→png→pdf→txt | format-loss | YES |
| gif→html | 4 | gif→jpg→pdf→html | gif→png→pdf→html | format-loss | YES |
| gz→zip | 5 | gz→zip | gz→zip | excellent | no |
| gz→7z | 5 | gz→7z | gz→7z | excellent | no |
| gz→tar | 5 | gz→tar | gz→tar | excellent | no |
| html→png | 4 | html→png | html→png | good | no |
| html→tiff | 4 | html→tiff | html→tiff | good | no |
| html→docx | 12 | html→docx | html→docx | good | no |
| html→odt | 15 | html→odt | html→odt | good | no |
| html→rtf | 9 | html→docx→rtf | html→docx→rtf | good | no |
| html→pdf | 13 | html→docx→pdf | html→docx→pdf | good | no |
| html→epub | 5 | html→epub | html→epub | good | no |
| html→mobi | 2 | html→epub→mobi | html→epub→mobi | good | no |
| html→azw3 | 2 | html→epub→azw3 | html→epub→azw3 | good | no |
| html→txt | 14 | html→txt | html→txt | good | no |
| html→rst | 7 | html→rst | html→rst | good | no |
| html→tex | 7 | html→md→tex | html→md→tex | good | no |
| jpg→png | 20 | jpg→png | jpg→png | good | no |
| jpg→webp | 17 | jpg→webp | jpg→webp | good | no |
| jpg→avif | 17 | jpg→avif | jpg→avif | good | no |
| jpg→tiff | 20 | jpg→tiff | jpg→tiff | good | no |
| jpg→gif | 17 | jpg→gif | jpg→gif | format-loss | no |
| jpg→docx | 4 | jpg→pdf→docx | jpg→pdf→docx | format-loss | no |
| jpg→pdf | 16 | jpg→pdf | jpg→pdf | excellent | no |
| jpg→txt | 4 | jpg→pdf→txt | jpg→pdf→txt | format-loss | no |
| jpg→html | 4 | jpg→pdf→html | jpg→pdf→html | format-loss | no |
| json→yaml | 17 | json→yaml | json→yaml | good | no |
| json→toml | 17 | json→toml | json→toml | good | no |
| json→xml | 17 | json→xml | json→xml | good | no |
| json→csv | 17 | json→csv | json→csv | good | no |
| json→tsv | 17 | json→tsv | json→tsv | good | no |
| m4a→mp3 | 17 | m4a→mp3 | m4a→mp3 | good | no |
| m4a→wav | 17 | m4a→wav | m4a→wav | excellent | no |
| m4a→flac | 17 | m4a→flac | m4a→flac | excellent | no |
| m4a→ogg | 17 | m4a→ogg | m4a→ogg | good | no |
| m4a→aac | 17 | m4a→aac | m4a→aac | good | no |
| md→png | 7 | md→html→png | md→html→png | good | no |
| md→tiff | 7 | md→html→tiff | md→html→tiff | good | no |
| md→docx | 12 | md→docx | md→docx | good | no |
| md→odt | 16 | md→odt | md→odt | good | no |
| md→rtf | 9 | md→docx→rtf | md→docx→rtf | good | no |
| md→pdf | 13 | md→docx→pdf | md→docx→pdf | good | no |
| md→epub | 9 | md→html→epub | md→docx→epub | good | YES |
| md→mobi | 2 | md→html→epub→mobi | md→docx→epub→mobi | good | YES |
| md→azw3 | 2 | md→html→epub→azw3 | md→docx→epub→azw3 | good | YES |
| md→txt | 14 | md→txt | md→txt | good | no |
| md→html | 13 | md→html | md→html | excellent | no |
| md→rst | 8 | md→rst | md→rst | good | no |
| md→tex | 4 | md→tex | md→tex | good | no |
| mkv→mp3 | 40 | mkv→mp3 | mkv→mp3 | good | no |
| mkv→m4a | 40 | mkv→m4a | mkv→m4a | good | no |
| mkv→wav | 40 | mkv→wav | mkv→wav | good | no |
| mkv→flac | 40 | mkv→flac | mkv→flac | good | no |
| mkv→ogg | 40 | mkv→ogg | mkv→ogg | good | no |
| mkv→aac | 40 | mkv→aac | mkv→aac | good | no |
| mkv→mp4 | 2 | mkv→mp4 | mkv→mp4 | good | no |
| mkv→webm | 2 | mkv→webm | mkv→webm | good | no |
| mkv→png | 7 | mkv→gif→png | mkv→gif→png | format-loss | no |
| mkv→webp | 7 | mkv→gif→webp | mkv→gif→webp | format-loss | no |
| mkv→avif | 7 | mkv→gif→avif | mkv→gif→avif | format-loss | no |
| mkv→tiff | 7 | mkv→gif→tiff | mkv→gif→tiff | format-loss | no |
| mkv→gif | 5 | mkv→gif | mkv→gif | format-loss | no |
| mkv→pdf | 4 | mkv→gif→jpg→pdf | mkv→gif→png→pdf | format-loss | YES |
| mov→mp3 | 50 | mov→mp3 | mov→mp3 | good | no |
| mov→m4a | 50 | mov→m4a | mov→m4a | good | no |
| mov→wav | 50 | mov→wav | mov→wav | good | no |
| mov→flac | 50 | mov→flac | mov→flac | good | no |
| mov→ogg | 50 | mov→ogg | mov→ogg | good | no |
| mov→aac | 50 | mov→aac | mov→aac | good | no |
| mov→mp4 | 5 | mov→mp4 | mov→mp4 | good | no |
| mov→webm | 5 | mov→webm | mov→webm | good | no |
| mov→mkv | 5 | mov→mkv | mov→mkv | excellent | no |
| mov→png | 8 | mov→gif→png | mov→gif→png | format-loss | no |
| mov→webp | 8 | mov→gif→webp | mov→gif→webp | format-loss | no |
| mov→avif | 8 | mov→gif→avif | mov→gif→avif | format-loss | no |
| mov→tiff | 8 | mov→gif→tiff | mov→gif→tiff | format-loss | no |
| mov→gif | 10 | mov→gif | mov→gif | format-loss | no |
| mov→pdf | 4 | mov→gif→jpg→pdf | mov→gif→png→pdf | format-loss | YES |
| mp3→m4a | 17 | mp3→m4a | mp3→m4a | good | no |
| mp3→wav | 17 | mp3→wav | mp3→wav | excellent | no |
| mp3→flac | 17 | mp3→flac | mp3→flac | excellent | no |
| mp3→ogg | 17 | mp3→ogg | mp3→ogg | good | no |
| mp3→aac | 17 | mp3→aac | mp3→aac | good | no |
| mp4→mp3 | 40 | mp4→mp3 | mp4→mp3 | good | no |
| mp4→m4a | 40 | mp4→m4a | mp4→m4a | good | no |
| mp4→wav | 40 | mp4→wav | mp4→wav | good | no |
| mp4→flac | 40 | mp4→flac | mp4→flac | good | no |
| mp4→ogg | 40 | mp4→ogg | mp4→ogg | good | no |
| mp4→aac | 40 | mp4→aac | mp4→aac | good | no |
| mp4→webm | 2 | mp4→webm | mp4→webm | good | no |
| mp4→mkv | 2 | mp4→mkv | mp4→mkv | excellent | no |
| mp4→png | 7 | mp4→gif→png | mp4→gif→png | format-loss | no |
| mp4→webp | 7 | mp4→gif→webp | mp4→gif→webp | format-loss | no |
| mp4→avif | 7 | mp4→gif→avif | mp4→gif→avif | format-loss | no |
| mp4→tiff | 7 | mp4→gif→tiff | mp4→gif→tiff | format-loss | no |
| mp4→gif | 5 | mp4→gif | mp4→gif | format-loss | no |
| mp4→pdf | 4 | mp4→gif→jpg→pdf | mp4→gif→png→pdf | format-loss | YES |
| odp→png | 2 | odp→pdf→png | odp→pdf→png | good | no |
| odp→tiff | 2 | odp→pdf→tiff | odp→pdf→tiff | good | no |
| odp→docx | 2 | odp→pdf→docx | odp→pdf→docx | good | no |
| odp→pdf | 2 | odp→pdf | odp→pdf | excellent | no |
| odp→txt | 2 | odp→pdf→txt | odp→pdf→txt | good | no |
| odp→html | 2 | odp→pdf→html | odp→pdf→html | good | no |
| ods→png | 2 | ods→pdf→png | ods→pdf→png | good | no |
| ods→tiff | 2 | ods→pdf→tiff | ods→pdf→tiff | good | no |
| ods→docx | 2 | ods→pdf→docx | ods→pdf→docx | good | no |
| ods→pdf | 2 | ods→pdf | ods→pdf | excellent | no |
| ods→txt | 2 | ods→pdf→txt | ods→pdf→txt | good | no |
| ods→html | 2 | ods→pdf→html | ods→pdf→html | good | no |
| odt→png | 4 | odt→pdf→png | odt→pdf→png | good | no |
| odt→tiff | 4 | odt→pdf→tiff | odt→pdf→tiff | good | no |
| odt→docx | 4 | odt→docx | odt→docx | excellent | no |
| odt→rtf | 2 | odt→rtf | odt→rtf | good | no |
| odt→pdf | 6 | odt→pdf | odt→pdf | excellent | no |
| odt→epub | 3 | odt→docx→epub | odt→docx→epub | good | no |
| odt→txt | 8 | odt→pdf→txt | odt→docx→txt | good | YES |
| odt→html | 8 | odt→pdf→html | odt→docx→html | good | YES |
| odt→rst | 4 | odt→docx→rst | odt→docx→rst | good | no |
| odt→tex | 2 | odt→docx→md→tex | odt→docx→md→tex | good | no |
| ogg→mp3 | 17 | ogg→mp3 | ogg→mp3 | good | no |
| ogg→m4a | 17 | ogg→m4a | ogg→m4a | good | no |
| ogg→wav | 17 | ogg→wav | ogg→wav | excellent | no |
| ogg→flac | 17 | ogg→flac | ogg→flac | excellent | no |
| ogg→aac | 17 | ogg→aac | ogg→aac | good | no |
| png→webp | 17 | png→webp | png→webp | good | no |
| png→avif | 17 | png→avif | png→avif | good | no |
| png→tiff | 20 | png→tiff | png→tiff | good | no |
| png→gif | 17 | png→gif | png→gif | format-loss | no |
| png→docx | 4 | png→pdf→docx | png→pdf→docx | format-loss | no |
| png→pdf | 16 | png→pdf | png→pdf | excellent | no |
| png→txt | 4 | png→pdf→txt | png→pdf→txt | format-loss | no |
| png→html | 4 | png→pdf→html | png→pdf→html | format-loss | no |
| ppt→png | 2 | ppt→pdf→png | ppt→pdf→png | good | no |
| ppt→tiff | 2 | ppt→pdf→tiff | ppt→pdf→tiff | good | no |
| ppt→docx | 2 | ppt→pdf→docx | ppt→pdf→docx | good | no |
| ppt→pdf | 2 | ppt→pdf | ppt→pdf | excellent | no |
| ppt→txt | 2 | ppt→pdf→txt | ppt→pdf→txt | good | no |
| ppt→html | 2 | ppt→pdf→html | ppt→pdf→html | good | no |
| rst→png | 7 | rst→html→png | rst→html→png | good | no |
| rst→tiff | 7 | rst→html→tiff | rst→html→tiff | good | no |
| rst→docx | 14 | rst→docx | rst→html→docx | good | YES |
| rst→odt | 18 | rst→odt | rst→html→odt | good | YES |
| rst→rtf | 9 | rst→docx→rtf | rst→html→docx→rtf | good | YES |
| rst→pdf | 13 | rst→docx→pdf | rst→html→docx→pdf | good | YES |
| rst→epub | 9 | rst→html→epub | rst→docx→epub | good | YES |
| rst→mobi | 2 | rst→html→epub→mobi | rst→html→epub→mobi | good | no |
| rst→azw3 | 2 | rst→html→epub→azw3 | rst→html→epub→azw3 | good | no |
| rst→txt | 15 | rst→txt | rst→txt | good | no |
| rst→html | 15 | rst→html | rst→html | excellent | no |
| rst→tex | 5 | rst→tex | rst→tex | good | no |
| rtf→png | 4 | rtf→pdf→png | rtf→pdf→png | good | no |
| rtf→tiff | 4 | rtf→pdf→tiff | rtf→pdf→tiff | good | no |
| rtf→docx | 4 | rtf→docx | rtf→docx | excellent | no |
| rtf→odt | 6 | rtf→odt | rtf→odt | excellent | no |
| rtf→pdf | 7 | rtf→pdf | rtf→pdf | excellent | no |
| rtf→epub | 3 | rtf→docx→epub | rtf→docx→epub | good | no |
| rtf→txt | 8 | rtf→pdf→txt | rtf→docx→txt | good | YES |
| rtf→html | 8 | rtf→pdf→html | rtf→docx→html | good | YES |
| rtf→rst | 4 | rtf→docx→rst | rtf→docx→rst | good | no |
| rtf→tex | 2 | rtf→docx→md→tex | rtf→docx→md→tex | good | no |
| tar→zip | 2 | tar→zip | tar→zip | excellent | no |
| tar→7z | 2 | tar→7z | tar→7z | excellent | no |
| tex→png | 2 | tex→html→png | tex→html→png | format-loss | no |
| tex→tiff | 2 | tex→html→tiff | tex→html→tiff | format-loss | no |
| tex→docx | 8 | tex→md→docx | tex→html→docx | good | YES |
| tex→odt | 10 | tex→md→odt | tex→html→odt | good | YES |
| tex→rtf | 4 | tex→md→docx→rtf | tex→html→docx→rtf | good | YES |
| tex→pdf | 5 | tex→md→docx→pdf | tex→html→docx→pdf | format-loss | YES |
| tex→epub | 4 | tex→html→epub | tex→html→docx→epub | good | YES |
| tex→txt | 8 | tex→md→txt | tex→html→txt | good | YES |
| tex→html | 5 | tex→html | tex→html | good | no |
| tex→rst | 6 | tex→md→rst | tex→html→rst | good | YES |
| tiff→png | 20 | tiff→png | tiff→png | good | no |
| tiff→webp | 17 | tiff→webp | tiff→webp | good | no |
| tiff→avif | 17 | tiff→avif | tiff→avif | good | no |
| tiff→gif | 17 | tiff→gif | tiff→gif | format-loss | no |
| tiff→docx | 4 | tiff→pdf→docx | tiff→pdf→docx | format-loss | no |
| tiff→pdf | 16 | tiff→pdf | tiff→pdf | excellent | no |
| tiff→txt | 4 | tiff→pdf→txt | tiff→pdf→txt | format-loss | no |
| tiff→html | 4 | tiff→pdf→html | tiff→pdf→html | format-loss | no |
| toml→json | 17 | toml→json | toml→json | good | no |
| toml→yaml | 17 | toml→yaml | toml→yaml | good | no |
| toml→xml | 17 | toml→xml | toml→xml | good | no |
| toml→csv | 17 | toml→csv | toml→csv | good | no |
| toml→tsv | 17 | toml→tsv | toml→tsv | good | no |
| ts→mp3 | 50 | ts→mp3 | ts→mp3 | good | no |
| ts→m4a | 50 | ts→m4a | ts→m4a | good | no |
| ts→wav | 50 | ts→wav | ts→wav | good | no |
| ts→flac | 50 | ts→flac | ts→flac | good | no |
| ts→ogg | 50 | ts→ogg | ts→ogg | good | no |
| ts→aac | 50 | ts→aac | ts→aac | good | no |
| ts→mp4 | 5 | ts→mp4 | ts→mp4 | good | no |
| ts→webm | 5 | ts→webm | ts→webm | good | no |
| ts→mkv | 5 | ts→mkv | ts→mkv | excellent | no |
| ts→png | 8 | ts→gif→png | ts→gif→png | format-loss | no |
| ts→webp | 8 | ts→gif→webp | ts→gif→webp | format-loss | no |
| ts→avif | 8 | ts→gif→avif | ts→gif→avif | format-loss | no |
| ts→tiff | 8 | ts→gif→tiff | ts→gif→tiff | format-loss | no |
| ts→gif | 10 | ts→gif | ts→gif | format-loss | no |
| ts→pdf | 4 | ts→gif→jpg→pdf | ts→gif→png→pdf | format-loss | YES |
| tsv→json | 17 | tsv→json | tsv→json | good | no |
| tsv→yaml | 17 | tsv→yaml | tsv→yaml | good | no |
| tsv→toml | 17 | tsv→toml | tsv→toml | good | no |
| tsv→xml | 17 | tsv→xml | tsv→xml | good | no |
| tsv→csv | 17 | tsv→csv | tsv→csv | good | no |
| txt→png | 2 | txt→html→png | txt→html→png | not-recommended | no |
| txt→tiff | 2 | txt→html→tiff | txt→html→tiff | not-recommended | no |
| txt→docx | 8 | txt→md→docx | txt→md→docx | format-loss | no |
| txt→odt | 10 | txt→md→odt | txt→md→odt | format-loss | no |
| txt→rtf | 4 | txt→md→docx→rtf | txt→md→docx→rtf | format-loss | no |
| txt→pdf | 5 | txt→md→docx→pdf | txt→md→docx→pdf | format-loss | no |
| txt→epub | 4 | txt→html→epub | txt→html→docx→epub | format-loss | YES |
| txt→html | 5 | txt→html | txt→html | format-loss | no |
| txt→rst | 6 | txt→md→rst | txt→md→rst | format-loss | no |
| txt→tex | 4 | txt→md→tex | txt→md→tex | format-loss | no |
| wav→mp3 | 17 | wav→mp3 | wav→mp3 | good | no |
| wav→m4a | 17 | wav→m4a | wav→m4a | good | no |
| wav→flac | 17 | wav→flac | wav→flac | excellent | no |
| wav→ogg | 17 | wav→ogg | wav→ogg | good | no |
| wav→aac | 17 | wav→aac | wav→aac | good | no |
| webm→mp3 | 40 | webm→mp3 | webm→mp3 | good | no |
| webm→m4a | 40 | webm→m4a | webm→m4a | good | no |
| webm→wav | 40 | webm→wav | webm→wav | good | no |
| webm→flac | 40 | webm→flac | webm→flac | good | no |
| webm→ogg | 40 | webm→ogg | webm→ogg | good | no |
| webm→aac | 40 | webm→aac | webm→aac | good | no |
| webm→mp4 | 2 | webm→mp4 | webm→mp4 | good | no |
| webm→mkv | 2 | webm→mkv | webm→mkv | excellent | no |
| webm→png | 7 | webm→gif→png | webm→gif→png | format-loss | no |
| webm→webp | 7 | webm→gif→webp | webm→gif→webp | format-loss | no |
| webm→avif | 7 | webm→gif→avif | webm→gif→avif | format-loss | no |
| webm→tiff | 7 | webm→gif→tiff | webm→gif→tiff | format-loss | no |
| webm→gif | 5 | webm→gif | webm→gif | format-loss | no |
| webm→pdf | 4 | webm→gif→jpg→pdf | webm→gif→png→pdf | format-loss | YES |
| webp→png | 20 | webp→png | webp→png | good | no |
| webp→avif | 17 | webp→avif | webp→avif | good | no |
| webp→tiff | 20 | webp→tiff | webp→tiff | good | no |
| webp→gif | 17 | webp→gif | webp→gif | format-loss | no |
| webp→docx | 4 | webp→pdf→docx | webp→pdf→docx | format-loss | no |
| webp→pdf | 16 | webp→pdf | webp→pdf | excellent | no |
| webp→txt | 4 | webp→pdf→txt | webp→pdf→txt | format-loss | no |
| webp→html | 4 | webp→pdf→html | webp→pdf→html | format-loss | no |
| wmv→mp3 | 50 | wmv→mp3 | wmv→mp3 | good | no |
| wmv→m4a | 50 | wmv→m4a | wmv→m4a | good | no |
| wmv→wav | 50 | wmv→wav | wmv→wav | good | no |
| wmv→flac | 50 | wmv→flac | wmv→flac | good | no |
| wmv→ogg | 50 | wmv→ogg | wmv→ogg | good | no |
| wmv→aac | 50 | wmv→aac | wmv→aac | good | no |
| wmv→mp4 | 5 | wmv→mp4 | wmv→mp4 | good | no |
| wmv→webm | 5 | wmv→webm | wmv→webm | good | no |
| wmv→mkv | 5 | wmv→mkv | wmv→mkv | excellent | no |
| wmv→png | 8 | wmv→gif→png | wmv→gif→png | format-loss | no |
| wmv→webp | 8 | wmv→gif→webp | wmv→gif→webp | format-loss | no |
| wmv→avif | 8 | wmv→gif→avif | wmv→gif→avif | format-loss | no |
| wmv→tiff | 8 | wmv→gif→tiff | wmv→gif→tiff | format-loss | no |
| wmv→gif | 10 | wmv→gif | wmv→gif | format-loss | no |
| wmv→pdf | 4 | wmv→gif→jpg→pdf | wmv→gif→png→pdf | format-loss | YES |
| xls→png | 3 | xls→pdf→png | xls→pdf→png | good | no |
| xls→tiff | 3 | xls→pdf→tiff | xls→pdf→tiff | good | no |
| xls→docx | 3 | xls→pdf→docx | xls→pdf→docx | good | no |
| xls→xlsx | 2 | xls→xlsx | xls→xlsx | excellent | no |
| xls→ods | 2 | xls→ods | xls→ods | excellent | no |
| xls→pdf | 5 | xls→pdf | xls→pdf | excellent | no |
| xls→txt | 3 | xls→pdf→txt | xls→pdf→txt | good | no |
| xls→html | 3 | xls→pdf→html | xls→pdf→html | good | no |
| xlsx→png | 2 | xlsx→pdf→png | xlsx→pdf→png | good | no |
| xlsx→tiff | 2 | xlsx→pdf→tiff | xlsx→pdf→tiff | good | no |
| xlsx→docx | 2 | xlsx→pdf→docx | xlsx→pdf→docx | good | no |
| xlsx→pdf | 2 | xlsx→pdf | xlsx→pdf | excellent | no |
| xlsx→txt | 2 | xlsx→pdf→txt | xlsx→pdf→txt | good | no |
| xlsx→html | 2 | xlsx→pdf→html | xlsx→pdf→html | good | no |
| xml→json | 17 | xml→json | xml→json | good | no |
| xml→yaml | 17 | xml→yaml | xml→yaml | good | no |
| xml→toml | 17 | xml→toml | xml→toml | good | no |
| xml→csv | 17 | xml→csv | xml→csv | good | no |
| xml→tsv | 17 | xml→tsv | xml→tsv | good | no |
| xz→zip | 5 | xz→zip | xz→zip | excellent | no |
| xz→7z | 5 | xz→7z | xz→7z | excellent | no |
| xz→tar | 5 | xz→tar | xz→tar | excellent | no |
| yaml→json | 17 | yaml→json | yaml→json | good | no |
| yaml→toml | 17 | yaml→toml | yaml→toml | good | no |
| yaml→xml | 17 | yaml→xml | yaml→xml | good | no |
| yaml→csv | 17 | yaml→csv | yaml→csv | good | no |
| yaml→tsv | 17 | yaml→tsv | yaml→tsv | good | no |
| zip→7z | 2 | zip→7z | zip→7z | excellent | no |
| zip→tar | 2 | zip→tar | zip→tar | excellent | no |
