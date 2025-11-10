const input = document.getElementById("file_input")
const view = document.getElementById("view_input")
const typef = document.getElementById("typefile")
const dots = document.querySelectorAll("dot")
const tab = document.getElementById("windo")
const code_root = document.getElementById("root_code")
const notvalidcode = (mess, nb = "") => {
    return `${nb==""?"":"<br><br>"}
    <intr>./$></intr><func>output</func>()<br><br>
    <intr>./$></intr><params> --${mess}--\t${nb==""?"": "=>" + nb} </params><br><br>
    <intr>./$></intr><func>try_again</func>() 
    `
}
const initialcode = `
<intr>./$></intr><func>choose_file</func>()<br><br>
<intr>./$>choose_file$></intr><func>specify</func>(<params>.mexplo</params>,<params> .json</params>)<br><br>
<intr>./$></intr><func>start</func>()
`
const cancelcode = `
<intr>./$></intr><func>output</func>()<br><br>
<intr>./$></intr><params> --Cancelled-- </params><br><br>
<intr>./$></intr><func>try_again</func>()
`
const completecode = `<br><br>
<intr>./$></intr><func>output</func>()<br><br>
<intr>./$></intr><params> --Success--</params><br><br>
<intr>./$></intr><func>click_and_load</func>()<br><br>
`
const dragcode = `
<intr>./$></intr><func>drag_file</func>()<br><br>
<intr>./$>choose_file$></intr><func>specify</func>(<params>.mexplo</params>,<params> .json</params>)<br><br>
<intr>./$></intr><func>start_drag</func>()
`
const manageFiles = async (files, event) => {
    event.preventDefault()
    view.innerHTML = initialcode
    if (!files || files.length <= 0)
        return view.innerHTML = notvalidcode("Selected items : none")
    for (const file of files) {
        const extension = file.name.split('.').pop().toLowerCase()
        if (!["mexplo", "json"].includes(extension)) {
            view.innerHTML += notvalidcode("File type not valid", file.name)
            continue
        }
        const contentFile = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = reject
            reader.readAsText(file)
        })
        console.log(contentFile)
        if (!contentFile) {
            view.innerHTML += notvalidcode("Error reading file, or empty", file.name)
            continue
        }
        switch (typef.value) {
            case "fractal":
                try {
                    const fractaltorender = Fractal.fromJSON(contentFile)
                    const link = "/view?from_file=" + encodeURIComponent(fractaltorender
                    .toJSON()) + "&type=fractal"
                    renderings.push(link)
                    console.log(fractaltorender)
                } catch (e) {
                    view.innerHTML += notvalidcode("Error parsing file's content as selected type", file.name)
                }
                break;
            default:
                view.innerHTML += notvalidcode("Selected type not valid", file.name)
                continue
        }
    }
    renderings.length > 0 ? view.innerHTML += completecode : ""
}
let renderings = []

view.addEventListener("click", () => {
    if(renderings.length == 0)  
        input.click() 
    else {
        const first = renderings.shift()
        if(renderings.length > 0) {
            const params = new URLSearchParams({ 
                urls: JSON.stringify(renderings) 
            })
            window.open("/hub?" + params.toString(), "_blank")
        }
        location.href = first
        renderings = []
        view.innerHTML = initialcode
    }
})
view.addEventListener("dragenter", (e) => {
    e.stopPropagation()
    e.preventDefault()
    view.classList.add("dragover")
    if(renderings.length == 0)
    {
        view.innerHTML = dragcode
    }
})
view.addEventListener("dragover", (e) => {
    e.stopPropagation()
    e.preventDefault()
})
view.addEventListener("dragleave", (e) => {
    e.stopPropagation()
    e.preventDefault()
    view.classList.remove("dragover")
    if(renderings.length == 0)
    {
        view.innerHTML = cancelcode
    }
})
view.addEventListener("drop", async(e) => {
    e.stopPropagation();
    e.preventDefault();
    view.classList.remove("dragover")
    if(renderings.length == 0)
    {
        const dt = e.dataTransfer;
        const files = dt.files;
        await manageFiles(files,e)
    }
})

input.addEventListener("change", async(e) => {
    await manageFiles(input.files,e)
})
dots.forEach(dot => {
    dot.addEventListener("click", async() => {
        tab.classList.toggle('fullscreen');
        view.classList.toggle('fullscreen-mid');
    })
})
input.addEventListener("cancel", () => {
    view.innerHTML = cancelcode
})