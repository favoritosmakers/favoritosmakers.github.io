# GitHub 업로드 API (서버리스)

이 폴더의 `github-upload.js`는 Vercel 서버리스 함수로, **클라이언트에 토큰을 두지 않고** GitHub에 프로젝트 데이터·파일을 올립니다.

## Vercel 배포 후 환경 변수 설정

1. [Vercel](https://vercel.com)에 이 프로젝트를 배포합니다.
2. 프로젝트 **Settings → Environment Variables**에서 아래 변수를 추가합니다.

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token (repo 권한) |
| `GITHUB_OWNER` | ✅ | 저장소 소유자 (예: favoritosmakers) |
| `GITHUB_REPO` | ✅ | 저장소 이름 (예: favoritosmakers.github.io) |
| `GITHUB_BRANCH` | | 브랜치 (기본: main) |
| `GITHUB_DATA_PATH` | | 프로젝트 JSON 경로 (기본: data/projects.json) |
| `GITHUB_DOWNLOADS_PATH` | | 파일 업로드 폴더 (기본: downloads) |
| `GITHUB_IMAGES_PATH` | | 이미지 업로드 폴더 (기본: images) |

3. **index.html**에서:
   - 같은 프로젝트를 Vercel로 배포한 경우: `API_BASE_URL`은 빈 문자열 `""`로 두면 됩니다.
   - HTML은 GitHub Pages, API는 Vercel에 두는 경우: `API_BASE_URL = "https://당신프로젝트.vercel.app"` 처럼 Vercel 배포 주소를 넣습니다.

이후 로그인 후 프로젝트 추가/수정/삭제 시 요청이 이 API로 가고, 서버에서만 토큰을 사용해 GitHub에 반영됩니다.
