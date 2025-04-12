import express from 'express';
import * as http from 'http';
import ejs from 'ejs';
import path from 'path';
import url from 'url';
import multer from 'multer';
import fs from 'fs';

interface FilesList {
    path: string;
    date: number;
    filename: string;
}

const getFiles = (): FilesList[] => {
    if (!fs.existsSync(path.join(__dirname, "files.json"))) { fs.writeFileSync(path.join(__dirname, "files.json"), "[]"); }
    let files = JSON.parse(fs.readFileSync(path.join(__dirname, "files.json"), 'utf8'));
    return (files)
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(path.join(__dirname, "files.json"))) { fs.writeFileSync(path.join(__dirname, "files.json"), "[]"); }
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }) }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ storage });

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, "views"));
app.engine('ejs', (path, data, cb) => {
    ejs.renderFile(path, data, {}, cb);
});

app.get('/', (req, res) => {
    let filesString: string = ""
    let files: FilesList[] = getFiles();
    files.forEach((file: FilesList) => {
        filesString += `<li class="list-group-item"><a href="/getFile/${file.filename}">${file.filename}</a></li>`;
    })
    res.render('index.ejs', { title: 'Hello World', files: filesString });
})

app.delete("/deleteFile/:filename", (req, res) => {
    let filename = req.params.filename;
    if (!fs.existsSync(path.join(__dirname, "uploads", filename))) return
    let files = getFiles();
    let fileIndex = files.findIndex((file: FilesList) => file.filename == filename);
    files.splice(fileIndex, 1);
    fs.writeFileSync(path.join(__dirname, 'files.json'), JSON.stringify(files));
    fs.unlinkSync(path.join(__dirname, "uploads", filename));
})

app.get("/getFiles", (req, res) => {
    res.send(getFiles());
})

app.get("/getFile/:filename", (req, res) => {
    let filename = req.params.filename;
    let files = getFiles();
    let file = files.find((file: FilesList) => file.filename === filename);
    if (!file) {
        res.status(404).send("File not found");
        return;
    }
    res.download(file.path, file.filename);
})


app.post("/upload/file", upload.single("File"), (req, res) => {
    var files = getFiles();
    if (!req.file) { res.status(400).send("No file uploaded"); }
    files.push({
        path: path.join(req.file!.destination,
            req.file!.filename),
        date: Date.now(),
        filename: req.file!.filename,
    });
    fs.writeFileSync(path.join(__dirname, 'files.json'), JSON.stringify(files));
    res.redirect("/");
})

const server = http.createServer(app);
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});