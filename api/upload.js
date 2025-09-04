
window.uploadFile = function () {
    const tok = prompt("请输入 GitHub Personal Access Token：");
    if (!tok) return;
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".xlsx";
    inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const content = await file.arrayBuffer().then(b => btoa(String.fromCharCode(...new Uint8Array(b))));
        const path = `uploads/${file.name}`;
        try {
            await GH.callGitHub("PUT", path, { message: `upload ${file.name}`, content, branch: GH.BRANCH }, tok);
            alert("上传成功！即将刷新"); location.reload();
        } catch (err) { alert("失败：" + err); }
    };
    inp.click(); // ✅ 用户点击触发，浏览器允许
};
