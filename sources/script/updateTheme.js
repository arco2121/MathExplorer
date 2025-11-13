let pre
document.addEventListener("DOMContentLoaded",() => {
    pre = document.documentElement.getAttribute("theme")
})
setInterval(() => {
    const statu = JSON.parse(localStorage.getItem("MathExplorerSettings"))
    const status = statu['theme_light']
    document.documentElement.setAttribute("theme", status)
    if(pre != document.documentElement.getAttribute("theme"))
        window.dispatchEvent(new Event("changed_theme"))
},50)