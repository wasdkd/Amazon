
window.GH = {
    OWNER: "wasdkd",
    REPO: "Amazon",
    BRANCH: "main",
    async callGitHub(method, path, body = null, token = "") {
        const url = `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${path}`;
        const opt = {
            method: method,
            headers: {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }
        };
        if (body) opt.body = JSON.stringify(body);
        const r = await fetch(url, opt);
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
};
