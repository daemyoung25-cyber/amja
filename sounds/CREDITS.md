# 음원 정보

| 파일 | 원본 | 작성자 | 라이선스 | 손본 것 |
|---|---|---|---|---|
| `waves.mp3` | [Ocean Surf Along the Coast of Maine](https://freesound.org/people/be-steele/sounds/362414/) | be-steele (Freesound) | CC0 1.0 | 100초부터 90초 잘라 반복 이음, 모노 80kbps |
| `chant.mp3` | [염불소리1](https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200020&wrtSn=13254274) — 공유마당, 키워드 반야심경·마하반야바라밀다심경 | 김용배 (한국저작권위원회 공유마당) | CC BY | 9초부터 108초 잘라 반복 이음, 모노 80kbps |
| `evening.mp3` | [산_선운산 선운사_저녁예불, 새소리, 범종, 목어, 운판, 목탁](https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200020&wrtSn=13372495) | JICA · (재)전주정보문화산업진흥원 (공유마당) | 공공누리 제1유형 (출처 표시) | 0초부터 96초 반복 이음, 모노 80kbps |

풍경 소리는 음원 없이 Web Audio로 합성한다.

예전 불경 음원(각원사 독경, 3bagbrew, CC0)은 반야심경 음원으로 바꿨다. 반야심경이 든 음원으로 바꿀 후보: [JongsouTemple - Seoul South Korea](https://freesound.org/people/RTB45/sounds/232411/) (RTB45, CC BY 4.0 — 쓰면 작성자 표시 필요).

## 그림

| 파일 | 원본 | 소장·작성자 | 라이선스 | 손본 것 |
|---|---|---|---|---|
| `models/buddha.glb` | 서라벌 천년왕경 금동제여래좌상 3D 에셋 ([국가유산 디지털 서비스](https://digital.khs.go.kr)) | 국가유산청 | 공공누리 제1유형 (출처 표시) | FBX를 GLB로, 텍스처 1024px webp, meshopt 압축 |
| `models/bodhisattva.glb` | 서라벌 천년왕경 선림원지 금동보살입상 3D 에셋 ([국가유산 디지털 서비스](https://digital.khs.go.kr)) | 국가유산청 | 공공누리 제1유형 (출처 표시) | Low FBX를 GLB로, 텍스처 연결, 면 수 절반, 1024px webp, meshopt |
| `textures/taenghwa.jpg` | [The Assembly of Tejaprabha Buddha](https://clevelandart.org/art/1998.120), 조선 | Cleveland Museum of Art | CC0 | 1536px로 줄임 |
| `textures/waternormals.jpg` | three.js 예제 텍스처 [waternormals.jpg](https://github.com/mrdoob/three.js/blob/r170/examples/textures/waternormals.jpg) | three.js authors | MIT | 그대로 (바다 잔물결 노멀 맵) |
| `models/gwaneum.glb` | 서라벌 천년왕경 분황사 석조관음보살입상 3D 에셋 ([국가유산 디지털 서비스](https://digital.khs.go.kr)) | 국가유산청 | 공공누리 제1유형 (출처 표시) | Lowpoly FBX를 GLB로, 텍스처 연결, 색을 흰 화강암 빛으로 밝힘, 1024px webp, meshopt |
| `textures/jijang.jpg` | [Bodhisattva Jijang (Kshitigarbha) and the Ten Kings of Hell](https://commons.wikimedia.org/wiki/File:Bodhisattva_Jijang_(Kshitigarbha)_and_the_Ten_Kings_of_Hell_LACMA_AC1994.49.1_(1_of_9).jpg), 조선 | LACMA | Public domain | 1280px로 줄임 |
| `textures/sinjung.jpg` | [Buddhist Deities](https://clevelandart.org/art/1999.119), 조선 | Cleveland Museum of Art | CC0 | 가장자리 잘라 1100px로 |

수미단, 단청 띠, 우물반자 무늬는 `src/scene/dancheong.js`에서 캔버스로 직접 그린다.
