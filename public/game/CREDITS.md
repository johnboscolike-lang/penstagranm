# 게임 에셋 출처

## 공개(CC0) 에셋 — Kenney (https://kenney.nl)

모두 [CC0 1.0 공개 도메인](https://creativecommons.org/publicdomain/zero/1.0/)이라 학교·교육·상업 어디에나 쓸 수 있고 표기는 필수가 아니다. 고마운 마음으로 남긴다.

| 위치 | 원본 팩 | 쓰임 |
|---|---|---|
| `kenney/*.png` | [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) (16×16 도트) | 보스·펫·대결 캐릭터 |
| `sfx/*.mp3` | [Interface Sounds](https://kenney.nl/assets/interface-sounds), [RPG Audio](https://kenney.nl/assets/rpg-audio), [Digital Audio](https://kenney.nl/assets/digital-audio), [Impact Sounds](https://kenney.nl/assets/impact-sounds), [Music Jingles](https://kenney.nl/assets/music-jingles) | 효과음. 소리 크기를 맞춰 mp3로 바꿨다 |

`scripts/assets/import-kenney.mjs`가 어떤 원본을 어떤 이름으로 옮겼는지 그대로 적어 두었다.

## 직접 만든 에셋

- 도트 캐릭터·소품·아이콘: `src/utils/art` 안의 문자 격자(ASCII)에서 만든다. 외부 이미지를 쓰지 않는다.
- 배경 음악(`bgm/*.mp3`): `scripts/audio/make-bgm.mjs`가 코드로 합성한다. 외부 음원·샘플이 없다.
- 글꼴: 갈무리(Galmuri, OFL 1.1) — `public/fonts/README.md` 참고.

## 쓰지 않은 것

넥슨의 메이플스토리 캐릭터·이미지는 넥슨의 저작물이라 허락 없이 게임에 넣을 수 없어서 쓰지 않았다.
