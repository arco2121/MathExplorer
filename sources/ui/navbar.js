document.body.querySelector("ui").innerHTML += `
<nav>
    <row>
        <button onclick="location.href='/'"><object type="image/svg+xml" data="./img/favicon.svg"></object></button>
        <h3>Math Explorer</h3>
    </row>
    <row>
        <button onclick="location.href='/upload'"><object type="image/svg+xml" data="./img/upload.svg"></object></button>
        <button id="colorthemeBt"><object type="image/svg+xml" data="./img/theme.svg"></object></button>
    </row>
</nav>
`