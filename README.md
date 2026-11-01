# 해조암 (amja)

바다가 내려다보이는 절벽 위 작은 암자에서, 모르는 사람들과 말없이 같이 머무는 3D 공간이에요.
난간에 기대 파도 소리를 듣고, 바다를 바라보는 관세음보살 앞에서 합장하고 절할 수 있어요. ("해조암"은 임시 이름)

주소: https://daemyoung25-cyber.github.io/amja/

## 로컬에서 보기

```bash
python -m http.server 8123      # 이 폴더에서
# http://localhost:8123/              혼자 모드 (firebase-config.js의 apiKey가 비어 있으면)
# http://localhost:8123/?time=19:30   그 한국 시각의 하늘 미리 보기
```

같이 있기 기능을 Firebase 없이 시험하려면 에뮬레이터를 켜고 `?emu=1`로 두 창을 열어요.

```bash
npx firebase-tools emulators:start --only auth,database --project demo-amja
```

## 테스트

```bash
npm test
```

## 알아 둘 것

- iPhone 옆의 무음 스위치가 켜져 있으면 소리가 나지 않을 수 있어요.
- 음원 출처는 `sounds/CREDITS.md`와 화면의 소리 설정 → 음원 정보에 있어요.
- 설계: `docs/2026-11-01-seaside-temple-design.md`
