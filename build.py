# #!/usr/bin/env python3
# """
# build.py → PPTAPI.html
# PDF/PPT 看板，零框架，GitHub Pages 直传
# """
# import datetime
# import textwrap
# from pathlib import Path
#
# SRC_DIR = Path("uploads")  # 放pdf/pptx
# OUT_FILE = Path("PPTAPI.html")  # 输出
#
#
# def build_dashboard():
#     files = list(SRC_DIR.glob("*.pdf")) + list(SRC_DIR.glob("*.pptx"))
#     cards = ""
#     for f in files:
#         fname = f.name
#         size = f.stat().st_size
#         mtime = f.stat().st_mtime
#         size_str = f"{size // 1024} KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.1f} MB"
#         time_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
#         file_url = f"uploads/{fname}"
#         cards += f"""
#         <div class="card">
#             <div class="card-header">{fname}</div>
#             <div class="card-body">
#                 <div class="file-info">
#                     <span>大小: {size_str}</span>
#                     <span>修改时间: {time_str}</span>
#                 </div>
#                 <a href="{file_url}" target="_blank" class="view-button">📖 在线浏览</a>
#                 <div class="card-actions">
#                     <button class="btn-del" onclick="deleteFile('{fname}')">🗑 删除</button>
#                     <button class="btn-cov" onclick="coverFile('{fname}')">🔄 覆盖</button>
#                 </div>
#             </div>
#         </div>
#         """
#
#     css = textwrap.dedent("""
#         :root{--primary:#0d6efd;--primary-dark:#0b5ed7;--gray-800:#212529;--gray-300:#dee2e6;--gray-100:#f8f9fa;--danger:#dc3545;--warning:#ffc107}
#         body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:20px;background:#f8f9fa;color:var(--gray-800)}
#         .container{max-width:100%;margin:0 auto}
#         /* === 头部：渐变背景 + 时间靠右 === */
#         .header{background:linear-gradient(120deg,var(--primary),var(--primary-dark));color:white;padding:1rem 2rem;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
#         .header h1{font-size:1.5rem;margin:0}
#         .header-time{font-size:1rem;opacity:0.9}
#         /* === 按钮组 === */
#         .top-bar{display:flex;justify-content:center;align-items:center;gap:5rem;margin-top:2rem;margin-bottom:2rem;flex-wrap:wrap}
#         .btn-top{pointer-events:none;background:#6c757d;color:#fff;border:none;padding:.5rem 1.2rem;border-radius:6px;font-size:.9rem}
#         .btn-act{background:var(--primary);color:#fff;border:none;padding:.5rem 1.2rem;border-radius:6px;cursor:pointer;font-weight:500;width:20%;transition:background .2s}
#         .btn-act:hover{background:var(--primary-dark)}
#         /* === 卡片栅格 4列居中 === */
#         .grid-wrapper{display:flex;justify-content:center}
#         .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;padding:1.5rem 0;max-width:1400px}
#         @media(max-width:1200px){.grid{grid-template-columns:repeat(3,1fr)}}
#         @media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
#         @media(max-width:600px){.grid{grid-template-columns:1fr}}
#         .card{background:#fff;border:1px solid var(--gray-300);border-radius:8px;overflow:hidden;box-shadow:0 .125rem .25rem rgba(0,0,0,.075);transition:all .2s}
#         .card:hover{transform:translateY(-.25rem);box-shadow:0 .5rem 1rem rgba(0,0,0,.15)}
#         .card-header{padding:.75rem 1rem;background:var(--primary);color:#fff;font-weight:600}
#         .card-body{padding:1.25rem}
#         .file-info{display:flex;justify-content:space-between;margin-bottom:1rem;font-size:.875rem;color:#6c757d}
#         .view-button{display:block;background:var(--primary);color:#fff;padding:.5rem 1rem;border-radius:8px;text-align:center;text-decoration:none;font-weight:500;transition:background .2s;margin-bottom:.5rem}
#         .view-button:hover{background:var(--primary-dark)}
#         .card-actions{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
#         .btn-del,.btn-cov{border:none;padding:.4rem;border-radius:6px;color:#fff;cursor:pointer}
#         .btn-del{background:var(--danger)}.btn-cov{background:var(--warning)}
#         .footer{text-align:center;padding:1rem;color:#6c757d;font-size:.875rem}
#     """)
#
#     js = """
#     <script>
# const owner="wasdkd",repo="Amazon",branch="main";
# function getToken(){return localStorage.getItem('gh_token');}
# function setToken(t){localStorage.setItem('gh_token',t);}
# async function callGitHub(method,path,body=null){
#     const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
#     const opt={method,headers:{
#         "Authorization":`token ${getToken()}`,
#         "Accept":"application/vnd.github.v3+json",
#         "Content-Type":"application/json"
#     }};
#     if(body) opt.body=JSON.stringify(body);
#     const r=await fetch(url,opt);
#     if(!r.ok) throw new Error(await r.text());
#     return r.json();
# }
# async function uploadFile(){
#     let tok=getToken(); if(!tok){tok=prompt("请输入GitHub Personal Access Token"); if(!tok)return; setToken(tok);}
#     const inp=document.createElement("input"); inp.type="file"; inp.accept=".pdf,.pptx"; inp.multiple=true;
#
#     // 使用 Promise 来处理文件选择
#     const filePromise = new Promise((resolve) => {
#         inp.onchange = (e) => resolve(e.target.files);
#     });
#
#     inp.click();
#
#     const files = await filePromise;
#     if (!files.length) return;
#
#     try {
#         for(let i = 0; i < files.length; i++) {
#             const file = files[i];
#             const content = await file.arrayBuffer().then(b=>btoa(String.fromCharCode(...new Uint8Array(b))));
#             await callGitHub("PUT",`uploads/${file.name}`,{message:`upload ${file.name}`,content,branch});
#         }
#         alert("全部上传完成，2-3分钟后自动刷新...");
#         location.reload();
#     } catch(e) {
#         alert("上传失败："+e);
#     }
# }
# async function deleteFile(name){
#     if(!confirm("确定删除？")) return;
#     let tok=getToken(); if(!tok){tok=prompt("请输入GitHub Personal Access Token"); if(!tok)return; setToken(tok);}
#     try{const {sha}=await callGitHub("GET",`uploads/${name}`); await callGitHub("DELETE",`uploads/${name}`,{message:`delete ${name}`,sha,branch}); alert("已删除，2-3分钟后自动刷新..."); location.reload();}catch(e){alert("失败："+e);}
# }
# async function coverFile(name){
#     let tok=getToken(); if(!tok){tok=prompt("请输入GitHub Personal Access Token"); if(!tok)return; setToken(tok);}
#     const inp=document.createElement("input"); inp.type="file"; inp.accept=".pdf,.pptx";
#
#     // 使用 Promise 来处理文件选择
#     const filePromise = new Promise((resolve) => {
#         inp.onchange = (e) => resolve(e.target.files[0]);
#     });
#
#     inp.click();
#
#     const file = await filePromise;
#     if (!file) return;
#
#     try {
#         const content=await file.arrayBuffer().then(b=>btoa(String.fromCharCode(...new Uint8Array(b))));
#         try{const {sha}=await callGitHub("GET",`uploads/${name}`); await callGitHub("DELETE",`uploads/${name}`,{message:`cover ${name}`,sha,branch}); await callGitHub("PUT",`uploads/${file.name}`,{message:`cover ${file.name}`,content,branch}); alert("已覆盖，2-3分钟后自动刷新..."); location.reload();}catch(e){alert("失败："+e);}
#     } catch(e) {
#         alert("失败："+e);
#     }
# }
# </script>
#     """
#
#     html = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
#     <title>PDF / PPT 看板</title><meta name="viewport" content="width=device-width,initial-scale=1">
#     <style>{css}</style></head><body><div class="container">
#     <div class="header"><h1>PDF / PPT 文件看板</h1><div class="header-time">{datetime.datetime.now():%Y-%m-%d %H:%M:%S}</div></div>
#     <div class="top-bar">
#       <button class="btn-top">增删改后需等2~3分钟</button>
#       <button class="btn-act" onclick="uploadFile()">📤 上传新文件</button>
#       <button class="btn-act" onclick="localStorage.removeItem('gh_token');alert('Token已清除');">🗑 清空Token</button>
#     </div>
#     <div class="grid-wrapper"><div class="grid">{cards}</div></div>
#     <div class="footer">共 {len(files)} 个文件 | 点击文件名直接浏览</div>
#     </div>{js}</body></html>"""
#
#     OUT_FILE.write_text(html, encoding='utf-8')
#     print(f"✅ {OUT_FILE} 已生成（含 {len(files)} 个文件）")
#
#
# if __name__ == "__main__":
#     build_dashboard()


# !/usr/bin/env python3
"""
build.py → index.html
PDF/PPT 看板，零框架，GitHub Pages 直传
支持大文件上传和在线预览
"""
import datetime
import textwrap
from pathlib import Path

SRC_DIR = Path("uploads")  # 放pdf/pptx
OUT_FILE = Path("index.html")  # 输出


def build_dashboard():
    files = list(SRC_DIR.glob("*.pdf")) + list(SRC_DIR.glob("*.pptx"))
    cards = ""

    for f in files:
        fname = f.name
        size = f.stat().st_size
        mtime = f.stat().st_mtime
        size_str = f"{size // 1024} KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.1f} MB"
        time_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
        file_url = f"uploads/{fname}"

        # 根据文件类型设置不同的查看方式
        if fname.lower().endswith('.pptx'):
            # 使用Microsoft Office Online查看PPT
            view_url = f"https://view.officeapps.live.com/op/embed.aspx?src=https://{owner}.github.io/{repo}/{file_url}"
            view_button = f'<a href="{view_url}" target="_blank" class="view-button">📊 在线预览PPT</a>'
        else:
            # PDF使用直接链接
            view_button = f'<a href="{file_url}" target="_blank" class="view-button">📖 在线浏览PDF</a>'

        cards += f"""
        <div class="card">
            <div class="card-header">{fname}</div>
            <div class="card-body">
                <div class="file-info">
                    <span>大小: {size_str}</span>
                    <span>修改时间: {time_str}</span>
                </div>
                {view_button}
                <div class="card-actions">
                    <button class="btn-del" onclick="deleteFile('{fname}')">🗑 删除</button>
                    <button class="btn-cov" onclick="coverFile('{fname}')">🔄 覆盖</button>
                    <a href="{file_url}" download="{fname}" class="btn-dl">📥 下载</a>
                </div>
            </div>
        </div>
        """

    css = textwrap.dedent("""
        :root{--primary:#0d6efd;--primary-dark:#0b5ed7;--gray-800:#212529;--gray-300:#dee2e6;--gray-100:#f8f9fa;--danger:#dc3545;--warning:#ffc107;--success:#198754}
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:20px;background:#f8f9fa;color:var(--gray-800)}
        .container{max-width:100%;margin:0 auto}
        /* === 头部：渐变背景 + 时间靠右 === */
        .header{background:linear-gradient(120deg,var(--primary),var(--primary-dark));color:white;padding:1rem 2rem;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap}
        .header h1{font-size:1.5rem;margin:0}
        .header-time{font-size:1rem;opacity:0.9}
        /* === 按钮组 === */
        .top-bar{display:flex;justify-content:center;align-items:center;gap:5rem;margin-top:2rem;margin-bottom:2rem;flex-wrap:wrap}
        .btn-top{pointer-events:none;background:#6c757d;color:#fff;border:none;padding:.5rem 1.2rem;border-radius:6px;font-size:.9rem}
        .btn-act{background:var(--primary);color:#fff;border:none;padding:.5rem 1.2rem;border-radius:6px;cursor:pointer;font-weight:500;width:20%;transition:background .2s}
        .btn-act:hover{background:var(--primary-dark)}
        /* === 卡片栅格 4列居中 === */
        .grid-wrapper{display:flex;justify-content:center}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;padding:1.5rem 0;max-width:1400px}
        @media(max-width:1200px){.grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.grid{grid-template-columns:1fr}}
        .card{background:#fff;border:1px solid var(--gray-300);border-radius:8px;overflow:hidden;box-shadow:0 .125rem .25rem rgba(0,0,0,.075);transition:all .2s}
        .card:hover{transform:translateY(-.25rem);box-shadow:0 .5rem 1rem rgba(0,0,0,.15)}
        .card-header{padding:.75rem 1rem;background:var(--primary);color:#fff;font-weight:600}
        .card-body{padding:1.25rem}
        .file-info{display:flex;justify-content:space-between;margin-bottom:1rem;font-size:.875rem;color:#6c757d;flex-wrap:wrap}
        .view-button{display:block;background:var(--primary);color:#fff;padding:.5rem 1rem;border-radius:8px;text-align:center;text-decoration:none;font-weight:500;transition:background .2s;margin-bottom:.5rem}
        .view-button:hover{background:var(--primary-dark)}
        .card-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem}
        .btn-del,.btn-cov,.btn-dl{border:none;padding:.4rem;border-radius:6px;color:#fff;cursor:pointer;text-align:center;text-decoration:none;font-size:0.85rem}
        .btn-del{background:var(--danger)}.btn-cov{background:var(--warning)}.btn-dl{background:var(--success)}
        .footer{text-align:center;padding:1rem;color:#6c757d;font-size:.875rem}
        .progress-bar{width:100%;height:20px;background:#e9ecef;border-radius:5px;margin-top:10px;overflow:hidden;display:none}
        .progress{height:100%;background:var(--primary);width:0%;transition:width 0.3s}
    """)

    js = f"""
    <script>
const owner="{owner}",repo="{repo}",branch="{branch}";
let largeFileWarningShown = false;

function getToken(){{return localStorage.getItem('gh_token');}}
function setToken(t){{localStorage.setItem('gh_token',t);}}

// 显示上传进度
function showProgress(filename, percent) {{
    let progressBar = document.getElementById('progress-bar');
    let progress = document.getElementById('progress');
    let progressText = document.getElementById('progress-text');

    if (!progressBar || !progress) {{
        // 创建进度条元素
        const progressHtml = `
        <div id="progress-bar" class="progress-bar">
            <div id="progress" class="progress"></div>
        </div>
        <div id="progress-text">上传 {{filename}}: 0%</div>
        `;
        document.querySelector('.top-bar').insertAdjacentHTML('afterend', progressHtml);
    }}

    document.getElementById('progress-bar').style.display = 'block';
    document.getElementById('progress').style.width = percent + '%';
    document.getElementById('progress-text').textContent = `上传 ${{filename}}: ${{percent}}%`;
}}

// 隐藏进度条
function hideProgress() {{
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    if (progressBar) progressBar.style.display = 'none';
    if (progressText) progressText.style.display = 'none';
}}

async function callGitHub(method,path,body=null){{
    const url=`https://api.github.com/repos/${{owner}}/${{repo}}/contents/${{path}}`;
    const opt={{method,headers:{{
        "Authorization":`token ${{getToken()}}`,
        "Accept":"application/vnd.github.v3+json",
        "Content-Type":"application/json"
    }}}};
    if(body) opt.body=JSON.stringify(body);
    const r=await fetch(url,opt);
    if(!r.ok) throw new Error(await r.text());
    return r.json();
}}

// 大文件上传使用Git LFS API
async function uploadLargeFile(file) {{
    if (!largeFileWarningShown) {{
        if (!confirm('大文件上传需要使用Git LFS，请确保您的仓库已启用LFS。继续吗？')) {{
            return false;
        }}
        largeFileWarningShown = true;
    }}

    try {{
        // 第一步：创建LFS对象
        const lfsRes = await fetch('https://github.com/{owner}/{repo}/git/blobs', {{
            method: 'POST',
            headers: {{
                "Authorization": `token ${{getToken()}}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }},
            body: JSON.stringify({{
                content: await file.arrayBuffer().then(b => btoa(String.fromCharCode(...new Uint8Array(b)))),
                encoding: 'base64'
            }})
        }});

        if (!lfsRes.ok) throw new Error('LFS上传失败: ' + await lfsRes.text());

        const lfsData = await lfsRes.json();

        // 第二步：提交到GitHub
        await callGitHub("PUT", `uploads/${{file.name}}`, {{
            message: `upload ${{file.name}}`,
            content: btoa(JSON.stringify({{
                oid: lfsData.sha,
                size: file.size,
                version: "https://git-lfs.github.com/spec/v1"
            }})),
            branch
        }});

        return true;
    }} catch (e) {{
        console.error('LFS上传错误:', e);
        alert('大文件上传失败: ' + e.message);
        return false;
    }}
}}

async function uploadFile(){{
    let tok=getToken(); 
    if(!tok){{
        tok=prompt("请输入GitHub Personal Access Token（需要repo权限）"); 
        if(!tok) return; 
        setToken(tok);
    }}

    const inp=document.createElement("input"); 
    inp.type="file"; 
    inp.accept=".pdf,.pptx"; 
    inp.multiple=true;

    inp.onchange = async (e) => {{
        const files = e.target.files;
        if (!files.length) return;

        try {{
            for(let i = 0; i < files.length; i++) {{
                const file = files[i];
                const maxSize = 75 * 1024 * 1024; // 75MB

                if (file.size > maxSize) {{
                    const success = await uploadLargeFile(file);
                    if (!success) continue;
                }} else {{
                    // 小文件使用常规上传
                    const content = await file.arrayBuffer().then(b => btoa(String.fromCharCode(...new Uint8Array(b))));
                    await callGitHub("PUT", `uploads/${{file.name}}`, {{message: `upload ${{file.name}}`, content, branch}});
                }}

                // 显示上传进度
                showProgress(file.name, (i + 1) / files.length * 100);
            }}

            alert("上传完成！页面将在10秒后刷新...");
            setTimeout(() => location.reload(), 10000);
        }} catch(e) {{
            alert("上传失败：" + e.message);
        }} finally {{
            hideProgress();
        }}
    }};

    inp.click();
}}

async function deleteFile(name){{
    if(!confirm("确定删除？")) return;
    let tok=getToken(); 
    if(!tok){{
        tok=prompt("请输入GitHub Personal Access Token"); 
        if(!tok) return; 
        setToken(tok);
    }}
    try{{
        const {{sha}}=await callGitHub("GET", `uploads/${{name}}`); 
        await callGitHub("DELETE", `uploads/${{name}}`, {{message: `delete ${{name}}`, sha, branch}}); 
        alert("已删除，页面将在10秒后刷新..."); 
        setTimeout(() => location.reload(), 10000);
    }}catch(e){{
        alert("删除失败：" + e.message);
    }}
}}

async function coverFile(name){{
    let tok=getToken(); 
    if(!tok){{
        tok=prompt("请输入GitHub Personal Access Token"); 
        if(!tok) return; 
        setToken(tok);
    }}

    const inp=document.createElement("input"); 
    inp.type="file"; 
    inp.accept=".pdf,.pptx";

    inp.onchange = async (e) => {{
        const file = e.target.files[0];
        if (!file) return;

        try {{
            // 先删除原文件
            const {{sha}} = await callGitHub("GET", `uploads/${{name}}`);
            await callGitHub("DELETE", `uploads/${{name}}`, {{message: `delete ${{name}}`, sha, branch}});

            // 上传新文件
            const content = await file.arrayBuffer().then(b => btoa(String.fromCharCode(...new Uint8Array(b))));
            await callGitHub("PUT", `uploads/${{file.name}}`, {{message: `cover ${{file.name}}`, content, branch}});

            alert("已覆盖，页面将在10秒后刷新...");
            setTimeout(() => location.reload(), 10000);
        }} catch(e) {{
            alert("覆盖失败：" + e.message);
        }}
    }};

    inp.click();
}}

// 页面加载时检查并刷新文件列表
async function refreshFileList() {{
    try {{
        const response = await fetch(`https://api.github.com/repos/${{owner}}/${{repo}}/contents/uploads?ref=${{branch}}`);
        if (response.ok) {{
            console.log('文件列表已更新');
        }}
    }} catch (e) {{
        console.log('无法刷新文件列表:', e);
    }}
}}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', function() {{
    // 设置自动刷新
    setTimeout(refreshFileList, 5000);

    // 显示最后更新时间
    document.getElementById('update-time').textContent = new Date().toLocaleString();
}});
</script>
    """

    html = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
    <title>PDF / PPT 看板</title><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>{css}</style></head><body><div class="container">
    <div class="header"><h1>PDF / PPT 文件看板</h1><div class="header-time">最后更新: <span id="update-time">{datetime.datetime.now():%Y-%m-%d %H:%M:%S}</span></div></div>
    <div class="top-bar">
      <button class="btn-top">增删改后需等待片刻刷新</button>
      <button class="btn-act" onclick="uploadFile()">📤 上传新文件</button>
      <button class="btn-act" onclick="localStorage.removeItem('gh_token');alert('Token已清除');">🗑 清空Token</button>
      <button class="btn-act" onclick="location.reload()">🔄 手动刷新</button>
    </div>
    <div class="grid-wrapper"><div class="grid">{cards}</div></div>
    <div class="footer">共 {len(files)} 个文件 | 点击文件名直接浏览 | <a href="https://github.com/{owner}/{repo}" target="_blank">查看GitHub仓库</a></div>
    </div>{js}</body></html>"""

    OUT_FILE.write_text(html, encoding='utf-8')
    print(f"✅ {OUT_FILE} 已生成（含 {len(files)} 个文件）")


if __name__ == "__main__":
    # 请替换为您的GitHub用户名和仓库名
    owner = "wasdkd"
    repo = "Amazon"
    branch = "main"

    build_dashboard()