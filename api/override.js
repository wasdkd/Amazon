
window.overrideFile = function (oldPath, oldSha) {
    const tok = prompt("请输入 GitHub Personal Access Token：");
    if (!tok) return;
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".xlsx";
    inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const content = await file.arrayBuffer().then(b => btoa(String.fromCharCode(...new Uint8Array(b))));
        try {
            await GH.callGitHub("DELETE", oldPath, { message: `override ${oldPath}`, sha: oldSha, branch: GH.BRANCH }, tok);
            await GH.callGitHub("PUT", oldPath, { message: `override ${oldPath}`, content, branch: GH.BRANCH }, tok);
            alert("覆盖成功！即将刷新"); location.reload();
        } catch (err) { alert("失败：" + err); }
    };
    inp.click(); // ✅ 用户点击触发
};
