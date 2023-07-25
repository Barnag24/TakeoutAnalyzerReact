import React, {useState} from "react";
import { useIndexedDB } from 'react-indexed-db';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ReTooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from "recharts";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import {FormControl, IconButton, InputLabel, MenuItem, Select, Typography} from "@mui/material";
import StorageIcon from '@mui/icons-material/Storage';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FunctionsIcon from '@mui/icons-material/Functions';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import Tooltip from '@mui/material/Tooltip';
import Alert from "@mui/material/Alert";
import {useSnackbar} from "notistack";

export default function YouTubeHistoryAnalyzer() {
    const {add, getAll, clear} = useIndexedDB("view_history");
    const [data, setData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [baseData, setBaseData] = useState( []);
    const [loading, setLoading] = useState(false);
    const [groupByValue, setGroupByValue] = useState(0);
    const [orderByValue, setOrderByValue] = useState(0);
    const [summarised, setSummarised] = useState(true);
    const toggleSummarised = () => setSummarised(!summarised);
    const { enqueueSnackbar } = useSnackbar();

    function createDataForVisualization() {
        setLoading(true);
        getAll().then(list => {
            if (list.length === 0) {
                enqueueSnackbar("No entries found in database! Load the right file first!", {variant: 'warning'});
                setLoading(false);
                return;
            }
            let counts = [];
            let searchedSum = 0;
            let advertSum = 0;
            for (const item of list) {
                let date = new Date(item.timestamp);
                let key = date.toDateString();
                if (counts[key] === undefined) {
                    counts[key] = {date: key, Searched: 0, Advert: 0, Count: 0};
                }
                if (item.adv) {
                    counts[key].Advert++;
                    advertSum++;
                } else {
                    counts[key].Searched++;
                    searchedSum++;
                }
                counts[key].Count++;
            }
            let update = [];
            for (const k in counts) {
                update.push(counts[k]);
            }
            setBaseData(update);
            showQueriedData(groupByValue, orderByValue, update);

            update = [
                { name: "Searched", value: searchedSum },
                { name: "Advert", value: advertSum }
            ];
            setPieData(update);

            setLoading(false);
        });
    }

    function processFile() {
        let input = document.getElementById("ythaFileInput").files[0];
        if (input === undefined) {
            return;
        }
        setLoading(true);
        let reader = new FileReader();
        reader.readAsText(input, "UTF-8");
        reader.onload = ev => {
            let text = ev.target.result.toString();
            let array;
            try {
                array = JSON.parse(text);
            }
            catch (e) {
                console.log(e)
                enqueueSnackbar("Wrong file type!", {variant: "error"});
                setLoading(false);
                return;
            }
            if (array.length === undefined || array.length === 0) {
                enqueueSnackbar("No suitable entries found in file!", {variant: 'warning'});
                setLoading(false);
                return;
            }
            clear(); // Clear the database
            let fileQueue = array.length;
            for (let i = 0; i < array.length; i++) {
                let obj = array[i]
                let newItem = {
                    timestamp: Date.parse(obj.time),
                    title: obj.title,
                    url: obj.titleUrl,
                    adv: (obj.details !== undefined)
                };
                if (isNaN(newItem.timestamp) || newItem.url === undefined) {
                    // We should continue processing in case of a wrong entry.
                    fileQueue--;
                    if (fileQueue === 0) {
                        enqueueSnackbar("File loaded successfully!", {variant: "success"});
                        createDataForVisualization();
                    }
                    continue;
                }
                // eslint-disable-next-line no-loop-func
                add(newItem).then(() => {
                    fileQueue--;
                    if (fileQueue === 0) {
                        enqueueSnackbar("File loaded successfully!", {variant: "success"});
                        createDataForVisualization();
                    }
                    // eslint-disable-next-line no-loop-func
                }, error => {console.log(error);
                    // TODO modularize to avoid duplicate lines
                    fileQueue--;
                    if (fileQueue === 0) {
                        enqueueSnackbar("File loaded successfully!", {variant: "success"});
                        createDataForVisualization();
                    }
                });
            }
        }
    }

    function showQueriedData(groupByValue, orderByValue, baseData) {
        if (baseData.length === 0) {
            return;
        }
        let update = [];
        if (groupByValue === 0) {
            update = [].concat(baseData);
        }
        else if (groupByValue === -1) {
            update = [].concat(data);
        }
        else {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            let groupedData = [];
            for (const el of baseData) {
                const date = new Date(el.date);
                const key = (groupByValue === 1 ? date.getFullYear().toString() + " " +
                    monthNames[date.getMonth()] : date.getFullYear().toString());
                if (groupedData[key] === undefined) {
                    groupedData[key] = {date: key, Searched: 0, Advert: 0, Count: 0};
                }
                groupedData[key].Searched += el.Searched;
                groupedData[key].Advert += el.Advert;
                groupedData[key].Count += el.Count;
            }

            for (const d in groupedData) {
                update.push(groupedData[d]);
            }
        }

        switch (orderByValue) {
            case 1:
                update.sort((a, b) => (Date.parse(a.date) > Date.parse(b.date) ? 1 : -1));
                break;
            case 2:
                update.sort((a, b) => (a.Count > b.Count ? -1 : 1));
                break;
            case 3:
                update.sort((a, b) => (a.Searched > b.Searched ? -1 : 1));
                break;
            case 4:
                update.sort((a, b) => (a.Advert > b.Advert ? -1 : 1));
                break;
            default:
                break;
        }

        setData(update);
    }

    function groupByChange(event) {
        setGroupByValue(event.target.value);
        showQueriedData(event.target.value, orderByValue, baseData);
    }

    function orderByChange(event) {
        setOrderByValue(event.target.value);
        showQueriedData(-1, event.target.value, baseData);
    }

    const RADIAN = Math.PI / 180;
    const renderPiePercentageLabel = ({
                                       cx,
                                       cy,
                                       midAngle,
                                       innerRadius,
                                       outerRadius,
                                       percent
                                      }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? "start" : "end"}
                dominantBaseline="central"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return <>
        <section>
            <Typography variant='h2' component='h3'>YouTube History Analyzer</Typography>
            <Alert severity="info">Analyze your YouTube view history! Input file: Takeout > YouTube and YouTube Music > history > view history.json</Alert>
            <div>
                <Box sx={{ m: 1, position: 'relative' }}>

                <Button startIcon={<UploadFileIcon />} sx={{m:2}} variant='contained' component='label'
                        disabled={loading}>
                    Select the file to process
                    <input id = "ythaFileInput" type="file" accept=".json" onChange={processFile} hidden />
                </Button>

                <Button startIcon={<StorageIcon />} sx={{m:2}} variant='contained' disabled={loading}
                        onClick={createDataForVisualization}>
                    Load data from DB
                </Button>

                    <Tooltip title={summarised ? 'Split by adverts' : 'Summarise counts'}>
                        <IconButton color='primary' sx={{m:2}} onClick={toggleSummarised}>
                            {summarised ? <StackedBarChartIcon /> : <FunctionsIcon />}
                        </IconButton>
                    </Tooltip>

                    <FormControl sx={{mx: 2}}>
                        <InputLabel id = 'group-by-select-label'>Group By</InputLabel>
                        <Select
                            labelId='group-by-select-label'
                            id='group-by-select'
                            value={groupByValue}
                            label="Group By"
                            onChange={groupByChange}
                        >
                            <MenuItem value={0}>Day</MenuItem>
                            <MenuItem value={1}>Month</MenuItem>
                            <MenuItem value={2}>Year</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl sx={{mx: 2}}>
                        <InputLabel id = 'order-by-select-label'>Sort By</InputLabel>
                        <Select
                            labelId='order-by-select-label'
                            id='order-by-select'
                            value={orderByValue}
                            label="Sort By"
                            onChange={orderByChange}
                        >
                            <MenuItem value={0}>None</MenuItem>
                            <MenuItem value={1}>Time</MenuItem>
                            <MenuItem value={2}>Count</MenuItem>
                            <MenuItem value={3}>Searched</MenuItem>
                            <MenuItem value={4}>Advert</MenuItem>
                        </Select>
                    </FormControl>

                {loading && (
                    <CircularProgress
                        size={24}
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '60%',
                            marginTop: '-12px',
                            marginLeft: '-12px',
                        }}
                    />
                )}

                </Box>
            </div>
            <div>
                <BarChart
                    width={1200}
                    height={600}
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5
                    }}
                    style={{display: 'inline-block'}}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ReTooltip />
                    <Legend />
                    { summarised ? <Bar dataKey="Count" stackId="a" fill="#ad2e9f" /> :
                    <><Bar dataKey="Searched" stackId="b" fill="#694BFF" />
                        <Bar dataKey="Advert" stackId="b" fill="#F1103E" /></> }
                </BarChart>

                <PieChart width={250} height={250} style={{display: 'inline-block'}}>
                    <ReTooltip />
                    <Legend />
                    <Pie
                        data={pieData}
                        cx={115}
                        cy={105}
                        labelLine={false}
                        label={renderPiePercentageLabel}
                        outerRadius={100}
                        fill="#ad2e9f"
                        dataKey="value"
                    >
                        <Cell fill='#694BFF' />
                        <Cell fill='#F1103E' />
                    </Pie>
                </PieChart>

            </div>
        </section>
    </>
}
