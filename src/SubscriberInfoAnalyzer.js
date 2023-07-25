import React, {useState} from "react";
import { useIndexedDB } from 'react-indexed-db';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import {Typography} from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import {useSnackbar} from "notistack";

export default function SubscriberInfoAnalyzer() {
    const {add, getAll, clear} = useIndexedDB("logins");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    let fileQueue = 0;

    function createDataForVisualization() {
        setLoading(true);
        getAll().then(list => {
            if (list.length === 0) {
                enqueueSnackbar("No entries found in database! Load the right file first!", {variant: 'warning'});
                setLoading(false);
                return;
            }
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            let counts = [];
            for (const item of list) {
                let date = new Date(item.timestamp);
                let key = date.getFullYear().toString() + " " + monthNames[date.getMonth()];
                if (counts[key] === undefined) {
                    counts[key] = {month: key, Count: 0};
                }
                counts[key].Count++;
            }
            let update = [];
            for (const k in counts) {
                update.push(counts[k]);
            }
            setData(update);
            setLoading(false);
        });

        // Old code using IndexedDB cursor
        /* openCursor(event => {
            const cursor = event.target.result;
            if (cursor) {
                const item = cursor.value;
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];
                let date = new Date(item.timestamp);
                let key = date.getFullYear().toString() + " " + monthNames[date.getMonth()];
                if (counts[key] === undefined) {
                    counts[key] = {month: key, Count: 0};
                }
                counts[key].Count++;
                cursor.continue();
            } else {
                let update = [];
                for (const k in counts) {
                    update.push(counts[k]);
                }
                setData(update);
                setLoading(false);
            }
        }, null); */
    }

    function processFile() {
        let input = document.getElementById("siaFileInput").files[0];
        if (input === undefined) {
            return;
        }
        setLoading(true);
        let reader = new FileReader();
        reader.readAsText(input, "UTF-8");
        reader.onload = ev => {
            let text = ev.target.result.toString();
            let doc = new DOMParser().parseFromString(text, "text/html")
            let rows = doc.getElementsByTagName("tr");
            if (rows.length === 0) {
                enqueueSnackbar("No suitable entries found in file!", {variant: 'warning'});
                setLoading(false);
                return;
            }
            clear(); // Clear the database
            // There is a header, so the indexing starts at 1.
            fileQueue = rows.length - 1;
            for (let i = 1; i < rows.length; i++) {
                let cells = rows[i].cells;
                try {
                    let newItem = {
                        timestamp: Date.parse(cells[0].innerText),
                        ip: cells[1].innerText,
                        type: cells[2].innerText,
                        agents: cells[3].innerText
                    };
                    // eslint-disable-next-line no-loop-func
                    add(newItem).then(() => {
                        fileQueue--;
                        if (fileQueue === 0) {
                            enqueueSnackbar("File loaded successfully!", {variant: "success"});
                            createDataForVisualization();
                        }
                        // eslint-disable-next-line no-loop-func
                    }, error => {
                        console.log(error);
                        // TODO modularize to avoid duplicate lines
                        fileQueue--;
                        if (fileQueue === 0) {
                            enqueueSnackbar("File loaded successfully!", {variant: "success"});
                            createDataForVisualization();
                        }
                    });
                } catch (e) {
                    // We should continue processing in case of a wrong entry.
                    fileQueue--;
                    if (fileQueue === 0) {
                        enqueueSnackbar("File loaded successfully!", {variant: "success"});
                        createDataForVisualization();
                    }
                }
            }
        }


    }

    return <>
        <section>
            <Typography variant='h2' component='h3'>Subscriber Info Analyzer</Typography>
            <Alert severity="info">Analyze your Google Account login data! Input file: Takeout > Google Account > accountName.SubscriberInfo.html </Alert>
            <div>
                <Box sx={{ m: 1, position: 'relative' }}>
                <Button startIcon={<UploadFileIcon />} sx={{m:2}} variant='contained' component='label' disabled={loading}>
                    Select the file to process<input id = "siaFileInput" type="file" accept=".html" onChange={processFile} hidden /></Button>
                <Button startIcon={<StorageIcon />} sx={{m:2}} variant='contained' disabled={loading} onClick={createDataForVisualization}>Load data from DB</Button>
                {loading && (
                    <CircularProgress
                        size={24}
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-12px',
                            marginLeft: '-12px',
                        }}
                    />
                )}
                </Box>
            </div>
            <div>
                <BarChart
                    width={1500}
                    height={600}
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Count" fill="#8884d8" />
                </BarChart>
            </div>
        </section>
    </>
}
