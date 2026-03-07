/**
 * 서버리스 API: GitHub에 프로젝트 데이터·파일 업로드
 * 환경 변수: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH(선택), GITHUB_DATA_PATH(선택), GITHUB_DOWNLOADS_PATH(선택), GITHUB_IMAGES_PATH(선택)
 */

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

async function githubPut(path, content, isBase64) {
  const c = getConfig();
  if (!c) throw new Error("GitHub 설정이 없습니다.");
  const body = {
    message: "Update " + path,
    branch,
    content: isBase64 ? content : Buffer.from(content, "utf8").toString("base64"),
  };
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

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

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

  const projects = [...projectsList];

  try {
    if (action === "save" && projectId != null) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        if (fileBase64 && fileName) {
          const fname =
            "f_" + Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = downloadsPath + "/" + fname;
          const result = await githubPut(path, fileBase64, true);
          if (result.content && result.content.download_url) {
            project.fileUrl = result.content.download_url;
            project.fileName = fileName;
          }
        }
        if (imageBase64 && imageFileName) {
          const iname =
            "img_" +
            Date.now() +
            "_" +
            (imageFileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "image.png");
          const path = imagesPath + "/" + iname;
          const result = await githubPut(path, imageBase64, true);
          if (result.content && result.content.download_url) {
            project.imageUrl = result.content.download_url;
          }
        }
      }
    }

    const json = JSON.stringify(projects, null, 2);
    await githubPut(dataPath, json, false);

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
