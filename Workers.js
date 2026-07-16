export default {
  // 事件1：Cron定时自动调度
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSyncTask(env, "定时Cron事件触发"));
  },

  // 事件2：HTTP网页/接口访问触发
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // 手动执行同步接口
      if (path === "/run") {
        const key = url.searchParams.get("key") ?? "";
        if (key !== (env.RUN_KEY ?? "")) {
          return new Response("密钥错误", { status: 403 });
        }
        ctx.waitUntil(runSyncTask(env, "HTTP接口/run手动触发"));
        return new Response("同步任务已后台运行，请查看日志");
      }

      // 可视化管理后台路由 /ckadmin
      if (path === "/ckadmin") {
        return await adminPageHandler(request, env);
      }

      // 所有未知路径返回404页面
      return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>404 Not Found</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#111;color:#fff;font-family:system-ui}
h1{font-size:60px;margin-bottom:10px;color:#ff4d4f}
p{font-size:18px;margin-bottom:24px;color:#aaa}
a{padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px}
</style>
</head>
<body>
<h1>404</h1>
<p>页面不存在，请访问管理后台 </p>
<a href="/999999">前往后台</a>
</body>
</html>
      `, {
        status: 404,
        headers: { "content-type": "text/html;charset=utf-8" }
      });
    } catch (globalErr) {
      console.error("全局请求异常：", globalErr);
      return new Response(`服务异常 Error 1101：${globalErr.message}`, { status: 500 });
    }
  }
};

const UA = "CF-Workers-GitSync-KV/2.0";

// 批量同步主逻辑，携带触发来源标识
async function runSyncTask(env, triggerSource) {
  let taskList = [];
  try {
    const kvRaw = await env.CONFIG_KV.get("taskList");
    if (kvRaw) taskList = JSON.parse(kvRaw);
  } catch (err) {
    console.log("KV无配置或JSON损坏，使用空任务列表");
    taskList = [];
  }

  console.log("======================================");
  console.log("任务触发来源：", triggerSource);
  console.log("本次同步任务总数：", taskList.length);
  console.log("======================================");

  for (const item of taskList) {
    if (!item.downloadUrl || !item.savePath) continue;
    await uploadToGithub(item.downloadUrl, item.savePath, env).catch(e => {
      console.error(`单任务失败 ${item.savePath}：`, e);
    });
  }
  console.log("批量同步流程结束\n");
}

async function adminPageHandler(req, env) {
  const cookie = req.headers.get("cookie") ?? "";
  const isLogin = cookie.includes("admin_auth=ok");
  const adminPwd = env.ADMIN_PWD ?? "";

  if (req.method === "POST") {
    const formData = await req.formData();
    if (formData.has("pass")) {
      const inputPwd = formData.get("pass");
      if (inputPwd !== adminPwd) {
        return new Response(`<script>alert("密码错误");history.back()</script>`, {
          headers: { "content-type": "text/html" }
        });
      }
      return new Response(`<script>document.cookie="admin_auth=ok;path=/;max-age=86400";location.href="/ckadmin"</script>`, {
        headers: { "content-type": "text/html" }
      });
    }

    if (!isLogin) return new Response("未登录", { status: 401 });
    const jsonStr = formData.get("taskJson") ?? "[]";
    let list = [];
    try {
      list = JSON.parse(jsonStr);
    } catch {
      list = [];
    }
    await env.CONFIG_KV.put("taskList", JSON.stringify(list, null, 2));
    return new Response(`<script>alert("配置保存成功");location.href="/ckadmin"</script>`, {
      headers: { "content-type": "text/html" }
    });
  }

  if (!isLogin) {
    return renderLoginPage();
  }

  let taskText = "[]";
  try {
    const kvData = await env.CONFIG_KV.get("taskList");
    if (kvData) taskText = JSON.stringify(JSON.parse(kvData), null, 2);
  } catch {
    taskText = "[]";
  }
  return renderAdminPage(taskText, env.RUN_KEY ?? "");
}

function renderLoginPage() {
  return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>管理员登录</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f2f5}
.login-card{width:340px;padding:28px;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
h2{text-align:center;margin-bottom:24px;color:#1f2937}
.input{width:100%;padding:12px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;margin-bottom:16px}
.btn-login{width:100%;padding:12px;background:#1677ff;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer}
</style>
</head>
<body>
<div class="login-card">
<h2>同步工具后台登录</h2>
<form method="post">
<input class="input" type="password" name="pass" placeholder="输入管理员密码" required>
<button class="btn-login" type="submit">登录后台</button>
</form>
</div>
</body>
</html>
`, { headers: { "content-type": "text/html" } });
}

function renderAdminPage(rawJson, runKey) {
  const safeJson = rawJson.replaceAll("`", "\\`").replaceAll("${", "\\${");
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>任务配置管理面板</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f0f2f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#1f2937}
.container{max-width:1100px;margin:0 auto}
.card{background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06)}
.title{font-size:20px;font-weight:600;margin-bottom:16px}
.tip{font-size:14px;color:#6b7280;margin-bottom:12px}
.flex-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
input{flex:1;min-width:260px;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
textarea{width:100%;min-height:420px;padding:14px;border:1px solid #d1d5db;border-radius:8px;font-family:monospace;font-size:14px}
.btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
button{padding:10px 18px;border:none;border-radius:8px;font-size:14px;cursor:pointer}
.btn-save{background:#00b42a;color:#fff}
.btn-run{background:#1677ff;color:#fff}
.btn-add{background:#722ed1;color:#fff}
.btn-logout{background:#f53f3f;color:#fff}
.json-error{color:#f53f3f;margin-top:8px;display:none}
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <div class="title">快捷添加任务</div>
    <div class="flex-row">
      <input id="urlInput" placeholder="外部下载链接 https://xxx/data.json">
      <input id="pathInput" placeholder="仓库保存路径 output/data.json">
      <button class="btn-add" onclick="addTask()">添加到列表</button>
    </div>
    <div class="tip">填入链接与保存路径，一键自动插入JSON编辑器</div>
  </div>

  <div class="card">
    <div class="title">任务列表编辑器（KV持久化）</div>
    <div class="tip">格式示例：[{"downloadUrl":"链接","savePath":"仓库路径"}]</div>
    <div class="json-error" id="jsonErr">JSON格式错误，请检查语法</div>
    <form method="post" onsubmit="return checkJson()">
      <textarea id="taskJson" name="taskJson">${safeJson}</textarea>
      <div class="btns">
        <button class="btn-save" type="submit">保存配置到KV</button>
        <button class="btn-run" type="button" onclick="runSync()">立即执行同步上传GitHub</button>
        <button class="btn-logout" type="button" onclick="logout()">退出登录</button>
      </div>
    </form>
  </div>
</div>

<script>
const runKey = "${runKey}";
const textarea = document.getElementById("taskJson");
const errTip = document.getElementById("jsonErr");

function checkJson(){
  try{
    JSON.parse(textarea.value);
    errTip.style.display = "none";
    return true;
  }catch(e){
    errTip.style.display = "block";
    errTip.innerText = "JSON格式错误：" + e.message;
    return false;
  }
}

function addTask(){
  const url = document.getElementById("urlInput").value.trim();
  const path = document.getElementById("pathInput").value.trim();
  if(!url || !path) return alert("链接和保存路径不能为空");
  let arr;
  try{
    arr = JSON.parse(textarea.value);
  }catch{
    arr = [];
  }
  arr.push({downloadUrl:url, savePath:path});
  textarea.value = JSON.stringify(arr,null,2);
  alert("任务已添加到列表");
}

async function runSync(){
  const res = await fetch(\`/run?key=\${runKey}\`);
  const text = await res.text();
  alert(text);
}

function logout(){
  document.cookie = "admin_auth=;path=/;max-age=0";
  location.reload();
}

textarea.addEventListener("input", checkJson);
</script>
</body>
</html>
`;
  return new Response(html, { headers: { "content-type": "text/html" } });
}

async function uploadToGithub(downloadUrl, savePath, env) {
  const { GH_TOKEN, GH_USER, GH_REPO, GH_BRANCH } = env;
  let res;
  try {
    res = await fetch(downloadUrl, { signal: AbortSignal.timeout(25000) });
  } catch (err) {
    console.error(`下载链接请求失败 ${downloadUrl}：`, err);
    return;
  }

  if (!res.ok) {
    console.error(`下载失败 ${downloadUrl} 状态码:${res.status}`);
    return;
  }

  let outputText;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("json") || contentType.includes("text")) {
    const raw = await res.text();
    try {
      const jsonObj = JSON.parse(raw);
      outputText = JSON.stringify(jsonObj, null, 2);
      console.log(`已自动格式化JSON: ${savePath}`);
    } catch {
      outputText = raw;
      console.log(`非JSON文本原样保存: ${savePath}`);
    }
  } else {
    const buf = await res.arrayBuffer();
    const arr = new Uint8Array(buf);
    let raw = "";
    for (const b of arr) raw += String.fromCharCode(b);
    outputText = raw;
  }

  const fileBase64 = btoa(unescape(encodeURIComponent(outputText)));
  let sha = null;

  try {
    const fileRes = await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${savePath}?ref=${GH_BRANCH}`,
      {
        headers: {
          Authorization: `token ${GH_TOKEN}`,
          "User-Agent": UA
        }
      }
    );
    if (fileRes.ok) {
      const info = await fileRes.json();
      sha = info.sha;
    }
  } catch {
    console.log(`文件不存在，新建: ${savePath}`);
  }

  const payload = {
    message: `KV配置自动更新 ${new Date().toLocaleString()}`,
    content: fileBase64,
    branch: GH_BRANCH
  };
  if (sha) payload.sha = sha;

  let pushRes;
  try {
    pushRes = await fetch(
      `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${savePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GH_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": UA
        },
        body: JSON.stringify(payload)
      }
    );
  } catch (err) {
    console.error(`上传请求异常 ${savePath}：`, err);
    return;
  }

  if (pushRes.ok) {
    console.log(`✅ ${savePath} 上传成功`);
  } else {
    const err = await pushRes.text();
    console.error(`❌ ${savePath} 上传失败:`, err);
  }
}
