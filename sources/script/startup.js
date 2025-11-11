const debug = false
const changeTheme = () => {
    if (debug) console.log("Status: " + !localStorage.getItem("theme"))
    const stat = localStorage.getItem("theme") == "true" ? false : true
    localStorage.setItem("theme", stat)
    document.documentElement.setAttribute("theme", localStorage.getItem("theme"))
}
const wait = async (time) => { return await new Promise(resolve => setTimeout(resolve, time)) }
const manageFullScreen = async (element, subElement = null, time = 100, blurValue = "2px", towards = false) => {
    if ((!element.classList.contains("fullscreen") && !subElement.classList.contains("fullscreen-mid")) && towards) {
        const rect = element.getBoundingClientRect()
        const placeholder = document.createElement('div')
        placeholder.style.width = rect.width + 'px'
        placeholder.style.height = rect.height + 'px'
        placeholder.style.minHeight = rect.height + 'px'
        placeholder.style.margin = "10px"
        placeholder.className = 'fullscreen-placeholder'
        element.parentNode.insertBefore(placeholder, element)
        element.dataset.placeholderId = 'placeholder-' + Date.now()
        placeholder.id = element.dataset.placeholderId
        element.dataset.originalTop = rect.top
        element.dataset.originalLeft = rect.left
        element.dataset.originalWidth = rect.width
        element.dataset.originalHeight = rect.height
        element.style.position = 'fixed'
        element.style.top = rect.top + 'px'
        element.style.left = rect.left + 'px'
        element.style.width = rect.width + 'px'
        element.style.height = rect.height + 'px'
        element.style.transform = 'none'
        element.style.margin = '0'
        element.style.borderRadius = '15px'
        element.style.maxWidth = 'none'
        element.style.maxHeight = 'none'
        element.style.border = "solid var(--back) 3px"
        element.style.filter = "blur(" + blurValue + "px)"
        element.offsetHeight
        subElement.classList.add('fullscreen-mid')
        element.classList.add('fullscreen')
        requestAnimationFrame(() => {
            element.style.top = '50%'
            element.style.left = '50%'
            element.style.transform = 'translate(-50%, -50%)'
            element.style.width = '100%'
            element.style.height = '100%'
        })
        await wait(time)
        subElement.classList.add('fullscreen-bounce')
        subElement.addEventListener('animationend', () => {
            subElement.classList.remove('fullscreen-bounce')
        }, { once: true })
        element.style.filter = "blur(0px)"
    } else if((element.classList.contains("fullscreen") && subElement.classList.contains("fullscreen-mid")) && !towards) {
        element.classList.remove('fullscreen')
        element.style.top = element.dataset.originalTop + 'px'
        element.style.left = element.dataset.originalLeft + 'px'
        element.style.width = element.dataset.originalWidth + 'px'
        element.style.height = element.dataset.originalHeight + 'px'
        element.style.filter = "blur(" + blurValue + "px)"
        element.style.border = "solid var(--opposite) 3px"
        element.style.transform = 'none'
        element.style.borderRadius = '15px'
        await wait(time)
        element.classList.add('fullscreen-bounce')
        element.addEventListener('animationend', () => {
            element.classList.remove('fullscreen-bounce')
        }, { once: true })
        element.style.filter = "blur(0px)"
        subElement.classList.remove('fullscreen-mid')
        const placeholder = document.getElementById(element.dataset.placeholderId)
        if (placeholder) placeholder.remove()
        element.style.cssText = ''
        delete element.dataset.originalTop
        delete element.dataset.originalLeft
        delete element.dataset.originalWidth
        delete element.dataset.originalHeight
        delete element.dataset.placeholderId
    }
}
/*StartUp*/
document.addEventListener("DOMContentLoaded", async() => {
    if (!localStorage.getItem("theme"))
        localStorage.setItem("theme", false)
    document.documentElement.setAttribute("theme", localStorage.getItem("theme"))
    await wait(300)
    document.documentElement.setAttribute("ready", 1)
})
document.getElementById("colorthemeBt").addEventListener("click", () => {
    if (debug) console.log("Status: " + !localStorage.getItem("theme"))
    changeTheme()
})