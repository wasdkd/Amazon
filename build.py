#!/usr/bin/env python3
"""
build.py → PPTAPI.html
PDF/PPT 看板，零框架，GitHub Pages 直传
"""
import datetime
import textwrap
from pathlib import Path

SRC_DIR  = Path("uploads")      # 放pdf/pptx
OUT_FILE = Path("PPTAPI.html")  # 输出

def build_dashboard():
    files = list(SRC_DIR.glob("*.pdf")) + list(SRC_DIR.glob("*.pptx"))
    cards = ""
    for f in files:
        fname = f.name
        size  = f.stat().st_size
        mtime = f.stat().st_mtime
        size_str = f"{size//1024} KB" if size < 1024*1024 else f"{size/(1024*1024):.1f} MB"
        time_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
        file_url = f"uploads/{fname}"
        cards += f"""
        <div class="card">
            <div class="card-header">{fname}</div>
            <div class="card-body">
                <div class="file-info">
                    <span>大小: {size_str}</span>
                    <span>修改时间: {time_str}</span>
                </div>
                <a href="{file_url}" target="_blank" class="view-button">📖 在线浏览</a>
                <div class="card-actions">
                    <button class="btn-del" onclick="deleteFile('{fname}')">🗑 删除</button>
                    <button class="btn-cov" onclick="coverFile('{fname}')">🔄 覆盖</button>
                </div>
            </div>
        </div>
        """

    css = textwrap.dedent("""
        :root{--primary:#0d6efd;--primary-dark:#0b5ed7;--gray-800:#212529;--gray-300:#dee2e6;--gray-100:#f8f9fa;--danger:#dc3545;--warning:#ffc107}
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
        .file-info{display:flex;justify-content:space-between;margin-bottom:1rem;font-size:.875rem;color:#6c757d}
        .view-button{display:block;background:var(--primary);color:#fff;padding:.5rem 1rem;border-radius:8px;text-align:center;text-decoration:none;font-weight:500;transition:background .2s;margin-bottom:.5rem}
        .view-button:hover{background:var(--primary-dark)}
        .card-actions{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
        .btn-del,.btn-cov{border:none;padding:.4rem;border-radius:6px;color:#fff;cursor:pointer}
        .btn-del{background:var(--danger)}.btn-cov{background:var(--warning)}
        .footer{text-align:center;padding:1rem;color:#6c757d;font-size:.875rem}
    """)

    js = """
    <script>
    const owner="wasdkd",repo="Amazon",branch="main";
    function getToken(){return localStorage.getItem('gh_token');}
    function setToken(t){localStorage.setItem('gh_token',t);}
    async function callGitHub(method,path,body=null){
        const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const opt={method,headers:{
            "Authorization":`token ${getToken()}`,
            "Accept":"application/vnd.github.v3+json",
            "Content-Type":"application/json"
        }};
        if(body) opt.body=JSON.stringify(body);
        const r=await fetch(url,opt);
        if(!r.ok) throw new Error(await r.text());
        return r.json();
    }
    async function uploadFile(){
        let tok=getToken(); if(!tok){tok=prompt("请输入 GitHub Personal Access Token："); if(!tok)return; setToken(tok);}
        const inp=document.createElement("input"); inp.type="file"; inp.accept=".pdf,.pptx"; inp.multiple=true;
        inp.onchange=async(e)=>{
            for(const file of e.target.files){
                const content=await file.arrayBuffer().then(b=>btoa(String.fromCharCode(...new Uint8Array(b))));
                try{await callGitHub("PUT",`uploads/${file.name}`,{message:`upload ${file.name}`,content,branch});}catch(e){alert("上传失败："+e); return;}
            }
            alert("全部上传完成，2-3分钟后自动刷新..."); location.reload();
        }; inp.click();
    }
    async function deleteFile(name){
        if(!confirm("确定删除？")) return;
        let tok=getToken(); if(!tok){tok=prompt("请输入 GitHub Personal Access Token："); if(!tok)return; setToken(tok);}
        try{const {sha}=await callGitHub("GET",`uploads/${name}`); await callGitHub("DELETE",`uploads/${name}`,{message:`delete ${name}`,sha,branch}); alert("已删除，2-3分钟后自动刷新..."); location.reload();}catch(e){alert("失败："+e);}
    }
    async function coverFile(name){
        let tok=getToken(); if(!tok){tok=prompt("请输入 GitHub Personal Access Token："); if(!tok)return; setToken(tok);}
        const inp=document.createElement("input"); inp.type="file"; inp.accept=".pdf,.pptx";
        inp.onchange=async(e)=>{
            const file=e.target.files[0]; if(!file) return;
            const content=await file.arrayBuffer().then(b=>btoa(String.fromCharCode(...new Uint8Array(b))));
            try{const {sha}=await callGitHub("GET",`uploads/${name}`); await callGitHub("DELETE",`uploads/${name}`,{message:`cover ${name}`,sha,branch}); await callGitHub("PUT",`uploads/${file.name}`,{message:`cover ${file.name}`,content,branch}); alert("已覆盖，2-3分钟后自动刷新..."); location.reload();}catch(e){alert("失败："+e);}
        }; inp.click();
    }
    </script>
    """

    html = f"""<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
    <title>PDF / PPT 看板</title><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>{css}</style></head><body><div class="container">
    <div class="header"><h1>PDF / PPT 文件看板</h1><div class="header-time">{datetime.datetime.now():%Y-%m-%d %H:%M:%S}</div></div>
    <div class="top-bar">
      <button class="btn-top">增删改后需等2~3分钟</button>
      <button class="btn-act" onclick="uploadFile()">📤 上传新文件</button>
      <button class="btn-act" onclick="localStorage.removeItem('gh_token');alert('Token已清除');">🗑 清空Token</button>
    </div>
    <div class="grid-wrapper"><div class="grid">{cards}</div></div>
    <div class="footer">共 {len(files)} 个文件 | 点击文件名直接浏览</div>
    </div>{js}</body></html>"""

    OUT_FILE.write_text(html, encoding='utf-8')
    print(f"✅ {OUT_FILE} 已生成（含 {len(files)} 个文件）")

if __name__ == "__main__":
    build_dashboard()