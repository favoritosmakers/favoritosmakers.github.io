/**
 * 서버리스 API: GitHub에 프로젝트 데이터·파일 업로드
 * 로그인 토큰 검증 후에만 처리 (비밀번호는 클라이언트에 없음)
 * 환경 변수: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, ADMIN_SECRET(토큰 검증용)
 */

import crypto from "crypto";

const branch = process.env.GITHUB_BRANCH || "main";
const dataPath = process.env.GITHUB_DATA_PATH || "data/projects.json";
const downloadsPath = process.env.GITHUB_DOWNLOADS_PATH || "downloads";
const imagesPath = process.env.GITHUB_IMAGES_PATH || "images";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) return null;
  return { token, owner, repo };
}

/** raw.githubusercontent.com URL에서 저장소 내 경로 추출 (기존 프로젝트 덮어쓰기용) */
function pathFromFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  const c = getConfig();
  if (!c) return null;
  const noQuery = fileUrl.split("?")[0].split("#")[0];
  const prefix = `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${branch}/`;
  return noQuery.startsWith(prefix) ? noQuery.slice(prefix.length) : null;
}

/** API가 주는 download_url은 비공개 시 ?token= 이 붙어 만료 후 404가 나므로, 토큰 없는 고정 raw URL만 저장한다. */
function stableRawUrl(repoPath) {
  const c = getConfig();
  if (!c || !repoPath) return null;
  const clean = String(repoPath).split("?")[0].split("#")[0];
  const encoded = clean
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${branch}/${encoded}`;
}

/** 기존 파일 정보 조회 (수정 시 sha 필요) */
async function githubGet(path) {
  const c = getConfig();
  if (!c) throw new Error("GitHub 설정이 없습니다.");
  const res = await fetch(
    `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: "Bearer " + c.token,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "GitHub API 오류");
  }
  return res.json();
}

async function githubPut(path, content, isBase64, existingSha = null) {
  const c = getConfig();
  if (!c) throw new Error("GitHub 설정이 없습니다.");
  const body = {
    message: "Update " + path,
    branch,
    content: isBase64 ? content : Buffer.from(content, "utf8").toString("base64"),
  };
  if (existingSha) body.sha = existingSha;
  const res = await fetch(
    `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}?ref=${branch}`,
    {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + c.token,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "GitHub API 오류");
  }
  return res.json();
}

async function githubDelete(path, sha) {
  const c = getConfig();
  if (!c) throw new Error("GitHub 설정이 없습니다.");
  const res = await fetch(
    `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}?ref=${branch}`,
    {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + c.token,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({ message: "Delete " + path, sha }),
    }
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "GitHub API 오류");
  }
  return res.status === 204 || res.status === 200;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function verifyAuthToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest("hex");
  if (expected !== sig) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return payload.admin === true && payload.exp > Date.now();
  } catch (e) {
    return false;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request) {
  const secret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!secret || !verifyAuthToken(token, secret)) {
    return new Response(
      JSON.stringify({ ok: false, error: "로그인이 필요합니다." }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const config = getConfig();
  if (!config) {
    return jsonResponse(
      {
        ok: false,
        error:
          "서버에 GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO 환경 변수를 설정해 주세요.",
      },
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "JSON 형식이 올바르지 않습니다." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const {
    action,
    projects: projectsList,
    projectId,
    fileBase64,
    fileName,
    imageBase64,
    imageFileName,
    deletedProject,
    fileUrl: bodyFileUrl,
    filePath: bodyFilePath,
    existingFilePathToDelete,
  } = body;

  if (action !== "save" && action !== "delete") {
    return new Response(
      JSON.stringify({ ok: false, error: "action은 save 또는 delete여야 합니다." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!Array.isArray(projectsList)) {
    return new Response(
      JSON.stringify({ ok: false, error: "projects 배열이 필요합니다." }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const projects = projectsList.map((p) => ({
    ...p,
    id: p.id != null ? String(p.id) : p.id,
  }));

  try {
    if (action === "delete" && deletedProject) {
      if (deletedProject.filePath) {
        const existing = await githubGet(deletedProject.filePath);
        if (existing && existing.sha) await githubDelete(deletedProject.filePath, existing.sha);
      }
      if (deletedProject.imagePath) {
        const existing = await githubGet(deletedProject.imagePath);
        if (existing && existing.sha) await githubDelete(deletedProject.imagePath, existing.sha);
      }
    }

    if (action === "save" && existingFilePathToDelete) {
      const existing = await githubGet(existingFilePathToDelete);
      if (existing && existing.sha) await githubDelete(existingFilePathToDelete, existing.sha);
    }

    if (action === "save" && projectId != null) {
      const project = projects.find((p) => p.id == projectId);
      if (project) {
        if (bodyFileUrl && !fileBase64) {
          const parsedPath = bodyFilePath || pathFromFileUrl(bodyFileUrl);
          if (parsedPath) {
            project.filePath = parsedPath;
            project.fileUrl = stableRawUrl(parsedPath);
          } else {
            project.fileUrl = bodyFileUrl.split("?")[0].split("#")[0];
            project.filePath = bodyFilePath || null;
          }
          if (fileName) project.fileName = fileName;
        } else if (fileBase64 && fileName) {
          const oldPath = project.filePath || pathFromFileUrl(project.fileUrl) || null;
          const isDifferentFile = oldPath && project.fileName && fileName !== project.fileName;
          let path;
          let result;
          if (isDifferentFile) {
            const existing = await githubGet(oldPath);
            if (existing && existing.sha) await githubDelete(oldPath, existing.sha);
            const fname =
              "f_" + Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
            path = downloadsPath + "/" + fname;
            result = await githubPut(path, fileBase64, true);
            project.filePath = path;
          } else if (oldPath) {
            const existing = await githubGet(oldPath);
            if (existing && existing.sha) {
              result = await githubPut(oldPath, fileBase64, true, existing.sha);
              path = oldPath;
            } else {
              const fname =
                "f_" + Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
              path = downloadsPath + "/" + fname;
              result = await githubPut(path, fileBase64, true);
              project.filePath = path;
            }
          } else {
            const fname =
              "f_" + Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
            path = downloadsPath + "/" + fname;
            result = await githubPut(path, fileBase64, true);
            project.filePath = path;
          }
          if (path) project.fileUrl = stableRawUrl(path);
          project.fileName = fileName;
        }
        if (imageBase64 && imageFileName) {
          const oldPath = project.imagePath || pathFromFileUrl(project.imageUrl) || null;
          if (oldPath) {
            const existing = await githubGet(oldPath);
            if (existing && existing.sha) await githubDelete(oldPath, existing.sha);
          }
          const iname =
            "img_" +
            Date.now() +
            "_" +
            (imageFileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png");
          const path = imagesPath + "/" + iname;
          const result = await githubPut(path, imageBase64, true);
          project.imagePath = path;
          if (path) project.imageUrl = stableRawUrl(path);
        }
      }
    }

    const json = JSON.stringify(projects, null, 2);
    const existing = await githubGet(dataPath);
    const sha = existing && existing.sha ? existing.sha : null;
    await githubPut(dataPath, json, false, sha);

    return new Response(JSON.stringify({ ok: true, projects }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("github-upload error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message || "GitHub 업로드 중 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
