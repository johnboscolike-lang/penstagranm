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
| `cc0/creatures/*.png` | [Tiny Creatures](https://opengameart.org/content/tiny-creatures) 1.0 (16×16 도트, 검은 배경을 투명으로 바꿈) | Clint Bellanger (clintbellanger.net) | 동물 펫 12종 |
| `cc0/emotes/*.png` | [Emotes Pack](https://kenney.nl/assets/emotes-pack) Pixel/Style 1 | Kenney | 대결 뒤 응원 이모트 8종 (응원·칭찬이 되는 것만 골랐다) |
| `cc0/items/*.png` | [The Ninja Adventure Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) 의 Items | Pixel-boy, AAA | 업적 아이콘 16종 (작은 그림은 16×16 가운데에 놓았다) |

`scripts/assets/import-cc0-extra.mjs`가 어떤 원본을 어떤 이름으로 옮겼는지 그대로 적어 두었다. 같은 팩의 글꼴·음악은 출처를 따로 확인하지 못해서 가져오지 않았다.

## 직접 만든 에셋

- 도트 캐릭터·모자·소품·아이콘: `src/utils/art` 안의 문자 격자(ASCII)에서 만든다.
- 배경 음악(`bgm/*.mp3`): `scripts/audio/make-bgm.mjs`가 코드로 합성한다. 외부 음원·샘플이 없다.
- 글꼴: 갈무리(Galmuri, OFL 1.1) — `public/fonts/README.md` 참고.

## 쓰지 않은 것

넥슨의 메이플스토리 캐릭터·이미지는 넥슨의 저작물이라 허락 없이 게임에 넣을 수 없어서 쓰지 않았다.
