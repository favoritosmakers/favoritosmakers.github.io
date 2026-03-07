# GitHub 업로드 API (서버리스)

이 폴더의 `github-upload.js`는 Vercel 서버리스 함수로, **클라이언트에 토큰을 두지 않고** GitHub에 프로젝트 데이터·파일을 올립니다.

---

## 2. 환경 변수 설정 (자세히)

Vercel에 배포한 뒤, **반드시** 아래 환경 변수를 설정해야 로그인 후 프로젝트 추가·수정·삭제가 GitHub에 반영됩니다.

### 2-1. GitHub Personal Access Token 만들기 (GITHUB_TOKEN)

토큰은 **GitHub 웹사이트**에서만 만들 수 있습니다.

**⚠️ 주의:** Developer settings는 **저장소(Repository) 설정**이 아니라 **내 계정 설정**에 있습니다.  
저장소 페이지 안의 **Settings**가 아니라, **GitHub 홈에서** 우측 상단 프로필 사진 → **Settings**로 들어가야 합니다.

**방법 A – 링크로 바로 가기 (가장 간단)**  
로그인한 상태에서 아래 주소로 이동하면 토큰 생성 페이지가 열립니다.

- **토큰 생성 페이지:** [https://github.com/settings/tokens/new](https://github.com/settings/tokens/new)

**방법 B – 메뉴로 찾기**  
1. GitHub **로그인** 후, **아무 페이지에서나** 우측 상단 **내 프로필 사진** 클릭.
2. **Settings** 클릭. (주소가 `github.com/settings/...` 로 시작해야 합니다. `github.com/계정이름/저장소이름/settings` 가 아니어야 합니다.)
3. 왼쪽 메뉴 **맨 아래**로 내려가서 **Developer settings** 클릭.
4. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.

**토큰 생성 시 입력할 내용**  
5. **Note**: 용도 표기. 예: `Vercel 포트폴리오 업로드`  
6. **Expiration**: 만료 기간 (90 days, 1 year, No expiration 등)  
7. **Select scopes**: **repo** 체크 (저장소 읽기/쓰기용)  
8. **Generate token** 클릭.  
9. **한 번만 표시되는** `ghp_xxxxxxxxxxxx` 값을 **복사**해 두고, 아래 2-3의 **GITHUB_TOKEN** 값으로 넣습니다.

---

### 2-2. GITHUB_OWNER, GITHUB_REPO 확인하기

업로드할 **저장소**가 어디인지 정해야 합니다.

- **GITHUB_OWNER**: 저장소를 소유한 계정/조직 이름  
  - 예: `favoritosmakers`  
  - GitHub 저장소 주소가 `https://github.com/favoritosmakers/favoritosmakers.github.io` 이면  
    → **favoritosmakers** 가 Owner입니다.
- **GITHUB_REPO**: 저장소 이름(프로젝트 이름)  
  - 위 예시에서는 **favoritosmakers.github.io** 입니다.

GitHub Pages를 쓰는 저장소라면 보통 `계정이름.github.io` 형태입니다.

---

### 2-3. Vercel 대시보드에서 환경 변수 입력하기

아래 순서대로 하면 됩니다.

**1단계: Vercel 들어가기**  
- [vercel.com](https://vercel.com) 접속 후 로그인합니다.

**2단계: 프로젝트 선택**  
- 대시보드에 배포한 프로젝트 목록이 보입니다.  
- **이 포트폴리오 사이트**에 해당하는 프로젝트 이름을 클릭해 들어갑니다.  
- (프로젝트가 없다면 먼저 이 폴더를 Vercel에 배포해야 합니다.)

**3단계: Settings 열기**  
- 프로젝트 안에서 **위쪽 탭**에 Overview, Deployments, **Settings** 등이 있습니다.  
- **Settings**를 클릭합니다.

**4단계: Environment Variables 메뉴로 이동**  
- Settings 페이지가 열리면 **왼쪽 메뉴**가 보입니다.  
- **Environment Variables**를 클릭합니다.  
- “Environment Variables” 또는 “Variables” 라고만 되어 있을 수도 있습니다.

**5단계: 변수 하나씩 추가**  
- **Add New** 또는 **Add** 버튼(또는 **Key**, **Name** 입력란 옆에 있는 추가 버튼)을 클릭합니다.  
- 다음 변수들을 각각 한 번에 하나씩 입력합니다.

| 입력할 곳 (Key / Name) | 입력할 값 (Value) |
|------------------------|-------------------|
| `GITHUB_TOKEN`         | GitHub에서 복사한 토큰 (`ghp_` 로 시작하는 긴 문자열) |
| `GITHUB_OWNER`         | GitHub 계정 이름 (예: `favoritosmakers`) |
| `GITHUB_REPO`          | 저장소 이름 (예: `favoritosmakers.github.io`) |
| `ADMIN_PASSWORD`       | **관리자 로그인 비밀번호** (원하는 값으로 설정, 클라이언트에 노출되지 않음) |
| `ADMIN_SECRET`         | **토큰 서명용 비밀키** (영문·숫자 조합 긴 문자열 권장, 예: `a1b2c3d4e5f6...` 32자 이상) |

- **Key**(또는 Name) 란에는 위 표의 왼쪽 값을 **그대로** 입력합니다.  
  띄어쓰기 없이, 대소문자 구분해서 입력하세요.  
- **Value**(또는 Value) 란에는 위 표의 오른쪽 값을 입력합니다.  
  `GITHUB_TOKEN`은 GitHub 토큰 생성 페이지에서 **복사**한 값을 붙여넣습니다.  
- **ADMIN_PASSWORD**: 이 사이트에서 "로그인"할 때 쓰는 비밀번호입니다. **Vercel 환경 변수에만** 넣으므로 소스 코드에 노출되지 않습니다.  
- **ADMIN_SECRET**: 로그인 후 발급되는 토큰을 서명하는 데 씁니다. **ADMIN_PASSWORD와 다른 값**으로, 추측하기 어려운 긴 문자열로 설정하세요.

**6단계: 적용 환경 선택**  
- 같은 줄에 **Production**, **Preview**, **Development** 체크박스가 있으면  
  **세 개 모두 체크**해 두는 것을 권장합니다.  
- (없으면 그대로 두고 다음 단계로 진행해도 됩니다.)

**7단계: 저장**  
- **Save** 또는 **Add** 버튼을 눌러 저장합니다.  
- **GITHUB_OWNER**, **GITHUB_REPO**도 같은 방식으로 **Add New** → Key/Value 입력 → Save 를 반복합니다.

**8단계: 재배포**  
- 환경 변수를 **처음 넣었거나**, **값을 수정한 경우**에는 한 번 재배포해야 적용됩니다.  
- 위쪽 탭에서 **Deployments**로 이동합니다.  
- 가장 위에 있는(가장 최근) 배포 한 개의 **오른쪽 ⋮(점 세 개)** 를 클릭합니다.  
- **Redeploy**를 선택한 뒤 확인하면, 새 환경 변수가 적용된 상태로 다시 배포됩니다.

**주의**  
- **GITHUB_TOKEN**, **ADMIN_PASSWORD**, **ADMIN_SECRET** 값은 비밀번호처럼 다루세요. Vercel에만 입력하고, 채팅·이메일·스크린샷에는 넣지 마세요.  
- Key 이름을 잘못 쓰면 동작하지 않습니다. 표에 적힌 변수명을 **정확히** 입력하세요.  
- **관리자 비밀번호를 바꾸려면**: Vercel → 이 프로젝트 → Settings → Environment Variables 에서 `ADMIN_PASSWORD` 값을 수정한 뒤 저장하고, Deployments에서 **Redeploy** 하면 됩니다. (소스 코드에는 비밀번호가 없습니다.)

---

### 2-4. 선택 환경 변수 (필요할 때만)

아래는 **설정하지 않아도** 기본값으로 동작합니다. 저장소 구조를 바꾸고 싶을 때만 넣으면 됩니다.

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `GITHUB_BRANCH` | `main` | 프로젝트 JSON·파일을 올릴 브랜치 |
| `GITHUB_DATA_PATH` | `data/projects.json` | 프로젝트 목록이 저장되는 파일 경로 |
| `GITHUB_DOWNLOADS_PATH` | `downloads` | APK 등 파일이 올라가는 폴더 |
| `GITHUB_IMAGES_PATH` | `images` | 대표 이미지가 올라가는 폴더 |

예: JSON을 루트에 두고 싶다면  
`GITHUB_DATA_PATH` = `projects.json`  
처럼 설정하면 됩니다.

---

## 3. index.html 쪽 설정

- **이 프로젝트 전체를 Vercel로 배포**한 경우:  
  `API_BASE_URL` 은 빈 문자열 `""` 로 두면 됩니다.
- **HTML은 GitHub Pages**, **API는 Vercel**에 두는 경우:  
  `API_BASE_URL = "https://당신프로젝트.vercel.app"` 처럼 Vercel 배포 주소를 넣습니다.

이후 로그인 → 프로젝트 추가/수정/삭제 시, 요청이 이 API로 가고 **서버에서만** 토큰을 사용해 GitHub에 반영됩니다.
