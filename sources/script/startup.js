const debug = false
const changeTheme = () => {
    if(debug) console.log("Status: " + !localStorage.getItem("theme"))
    const stat = localStorage.getItem("theme") == "true" ? false : true
    localStorage.setItem("theme",stat)
    document.documentElement.setAttribute("theme",localStorage.getItem("theme"))
}
/*StartUp*/
document.addEventListener("DOMContentLoaded",()=>{
    if(!localStorage.getItem("theme"))
        localStorage.setItem("theme",false)
    document.documentElement.setAttribute("theme",localStorage.getItem("theme"))
    setTimeout(()=>{
        document.documentElement.setAttribute("ready",1)
    },200)
})
document.getElementById("colorthemeBt").addEventListener("click", () => {
    if(debug) console.log("Status: " + !localStorage.getItem("theme"))
    changeTheme()
})