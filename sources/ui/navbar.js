document.body.querySelector("ui").innerHTML += `
<nav>
    <row>
        <img onclick="location.href = '/'" width="30" src="./img/favicon.png">
        <h3>Math Explorer</h3>
    </row>
    <row>
        <button><object type="image/svg+xml" data="./img/upload.svg"></object></button>
        <button id="colorthemeBt"><object type="image/svg+xml" data="./img/theme.svg"></object></button>
    </row>
</nav>
`