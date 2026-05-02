async function loadGitHubRepos() {
    const username = "YOUR_USERNAME";

    const response = await fetch(`https://api.github.com/users/FIlip-Work-Hulten/repos`);
    const repos = await response.json();

    const container = document.getElementById("github-projects");

    repos.forEach(repo => {
        const div = document.createElement("div");
        div.className = "repo-card";

        div.innerHTML = `
            <h3><a href="${repo.html_url}" target="_blank">${repo.name}</a></h3>
            <p>${repo.description || "No description"}</p>
            <small>⭐ ${repo.stargazers_count}</small>
        `;

        container.appendChild(div);
    });
}

loadGitHubRepos();
