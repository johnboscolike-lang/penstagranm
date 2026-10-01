# 게임 에셋 출처

## 공개(CC0) 에셋 — Kenney (https://kenney.nl)

모두 [CC0 1.0 공개 도메인](https://creativecommons.org/publicdomain/zero/1.0/)이라 학교·교육·상업 어디에나 쓸 수 있고 표기는 필수가 아니다. 고마운 마음으로 남긴다.

| 위치 | 원본 팩 | 쓰임 |
|---|---|---|
| `kenney/*.png` | [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) (16×16 도트) | 학급 보스·펫·대결 상대 |
| `sfx/*.mp3` | [Interface Sounds](https://kenney.nl/assets/interface-sounds), [RPG Audio](https://kenney.nl/assets/rpg-audio), [Digital Audio](https://kenney.nl/assets/digital-audio), [Impact Sounds](https://kenney.nl/assets/impact-sounds), [Music Jingles](https://kenney.nl/assets/music-jingles) | 효과음. 소리 크기를 맞춰 mp3로 바꿨다 |

`scripts/assets/import-kenney.mjs`가 어떤 원본을 어떤 이름으로 옮겼는지 그대로 적어 두었다.

## 공개(CC0) 에셋 — 그 밖의 제작자 (확인일 2026-10-01)

팩 안의 라이선스 파일(License.txt / LICENSE.txt)에서 CC0 1.0임을 직접 확인했다. 표기는 필수가 아니지만 고마운 마음으로 남긴다.

| 위치 | 원본 팩 | 제작자 | 쓰임 |
|---|---|---|---|
| `cc0/creatures/*.png` | [Tiny Creatures](https://opengameart.org/content/tiny-creatures) 1.0 (16×16 도트, 검은 배경을 투명으로 바꿈) | Clint Bellanger (clintbellanger.net) | 동물 펫 14종 |
| `cc0/emotes/*.png` | [Emotes Pack](https://kenney.nl/assets/emotes-pack) Pixel/Style 1 | Kenney | 대결 뒤 응원 이모트 8종 (응원·칭찬이 되는 것만 골랐다) |
| `cc0/items/*.png` | [The Ninja Adventure Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) 의 Items | Pixel-boy, AAA | 업적 아이콘 16종 (작은 그림은 16×16 가운데에 놓았다) |

`scripts/assets/import-cc0-extra.mjs`가 어떤 원본을 어떤 이름으로 옮겼는지 그대로 적어 두었다. 같은 팩의 글꼴·음악은 출처를 따로 확인하지 못해서 가져오지 않았다.

## 직접 만든 에셋

- 도트 캐릭터·모자·소품·아이콘: `src/utils/art` 안의 문자 격자(ASCII)에서 만든다.
- 배경 음악(`bgm/*.mp3`): `scripts/audio/make-bgm.mjs`가 코드로 합성한다. 외부 음원·샘플이 없다.
- 글꼴: 갈무리(Galmuri, OFL 1.1) — `public/fonts/README.md` 참고.

## 쓰지 않은 것

넥슨의 메이플스토리 캐릭터·이미지는 넥슨의 저작물이라 허락 없이 게임에 넣을 수 없어서 쓰지 않았다.

## 외부 CC0 배경 음악 3곡 — OpenGameArt

`bgm/battle.mp3`, `bgm/boss.mp3`, `bgm/play.mp3`는 위 "직접 만든 에셋"의 합성 음악이 아니라 OpenGameArt(https://opengameart.org)에서 받은 [CC0 1.0 공개 도메인](https://creativecommons.org/publicdomain/zero/1.0/) 곡이다. 표기는 필수가 아니지만 고마운 마음으로 남긴다. (`school`·`challenge`·`room`·`arena`·`teacher` 5곡은 그대로 `make-bgm.mjs`로 합성한 곡이다.)

| 파일 | 곡 제목 | 작가 | 라이선스 | 출처 페이지 | 쓰임 |
|---|---|---|---|---|---|
| `bgm/battle.mp3` | Grizzly Dwarf Battle (LOOP) — "Glizzy Elf Forest [RPG MUSIC PACK]" 안의 곡 | Zane Little (OpenGameArt 계정: Zane Little Music) | CC0 | [OpenGameArt — Glizzy Elf Forest [RPG MUSIC PACK]](https://opengameart.org/content/glizzy-elf-forest-rpg-music-pack) | 대결(아레나) 전투 음악 |
| `bgm/boss.mp3` | Epic Boss Battle [Seamlessly Looping] | Juhani Junkala (OpenGameArt 업로더: SubspaceAudio) | CC0 | [OpenGameArt — Boss Battle Music](https://opengameart.org/content/boss-battle-music) | 주간 학급 보스 음악 |
| `bgm/play.mp3` | Level 1 — "[Retro Game Music Pack]" 중 "5 Chiptunes (Action)" 묶음 | Juhani Junkala (OpenGameArt 업로더: SubspaceAudio) | CC0 | [OpenGameArt — 5 Chiptunes (Action)](https://opengameart.org/content/5-chiptunes-action) | 빠른 미니게임 음악 |

### CC0라고 판단한 근거 (2026-10-01 확인)

- `battle.mp3`: OGA 페이지 License(s) 필드가 CC0. 받은 압축 파일(`loops_and_intros.zip`) 안에는 별도 라이선스 문구가 없고 WAV 태그에도 라이선스 문구가 없다. 근거는 OGA 페이지 하나뿐이다.
- `boss.mp3`: OGA 페이지 License(s) 필드가 CC0. 받은 파일은 WAV 한 개뿐이고, 그 태그에 "Loop Ready, Free to Use Anywhere"라고 적혀 있다(CC0라는 말은 없고 자유 사용 문구).
- `play.mp3`: OGA 페이지 License(s) 필드가 CC0. 압축 파일 안 `INFO.txt`에 "These music tracks have been released under CC0 creative commons license. You can do anything you want with these tunes."라고 적혀 있다.

### 변환과 확인 범위

- `scripts/audio/import-cc0-bgm.mjs`가 원본 WAV에서 mp3로 바꾼다(어떤 원본을 어떤 이름으로 옮겼는지 `TRACKS` 표에 적어 두었다). loudnorm 2패스(linear)로 통합 -19 LUFS 근처에 맞추고, 96 kbps 스테레오 44.1 kHz로 인코딩한다. 앞뒤를 자르거나 페이드를 넣지 않았다.
- 이 3곡은 귀로 들어 보며 확인하지 않았다. 음량·길이·반복 이음새는 ffmpeg 수치로만 확인했다. 곡 분위기와 반복 느낌은 사람이 직접 들어 보고 확정해야 한다.
