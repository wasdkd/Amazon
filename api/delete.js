
window.deleteFile = async function (path, sha) {
    const tok = prompt("请输入 GitHub Personal Access Token：");
    if (!tok) return;
    try {
        await GH.callGitHub("DELETE", path, { message: `delete ${path}`, sha, branch: GH.BRANCH }, tok);
        alert("删除成功！即将刷新"); location.reload();
    } catch (err) { alert("失败：" + err); }
};
