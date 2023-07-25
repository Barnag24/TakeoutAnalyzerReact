import React, {useState} from "react";
import { useIndexedDB } from 'react-indexed-db';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ReTooltip,
    Legend
} from "recharts";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import {IconButton, Typography} from "@mui/material";
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import StackedBarChartIcon from "@mui/icons-material/StackedBarChart";
import FunctionsIcon from "@mui/icons-material/Functions";
import SortIcon from '@mui/icons-material/Sort';
import Tooltip from '@mui/material/Tooltip';
import {useSnackbar} from "notistack";

export default function Webscraper() {
    const {getAll} = useIndexedDB("view_history");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sum, setSum] = useState(0);
    const [progress,  setProgress] = useState(0);
    const [summarised, setSummarised] = useState(true);
    const toggleSummarised = () => setSummarised(!summarised);
    const { enqueueSnackbar } = useSnackbar();

    const normalize = (value, max) => value * 100 / max;

    const sortDataByCount = () => {
        setLoading(true);
        const dataCpy =  [].concat(data);
        setData(dataCpy.sort((a, b) => (a.Count > b.Count) ? -1 : ((b.Count > a.Count) ? 1 : 0)));
        setLoading(false);
    }

    function CircularProgressWithLabel(props) {
        return (
            <Box>
                <CircularProgress
                    size={32}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-16px',
                        marginLeft: '-16px',
                    }}
                    variant="determinate" {...props} />
                <Box
                    sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Typography variant="caption" component="div" color="text.secondary">
                        {`${Math.round(props.value)}%`}
                    </Typography>
                </Box>
            </Box>
        );
    }

    function createDataForVisualization() {
        setLoading(true);
        setProgress(0);
        getAll().then(list => {
            if (list.length === 0) {
                enqueueSnackbar("No entries found in database! Load the history file first!", {variant: 'warning'});
                setLoading(false);
                return;
            }
            // CORS proxy is needed at the same origin or locally, testing connection
            fetch("http://127.0.0.1:8080/", {headers: {
                    'X-Requested-With': 'XmlHttpRequest'
                }}).then(() => {
                let associativeData = [];
                let queue = list.length;
                for (const el of list) {
                    fetch("http://127.0.0.1:8080/"+el.url, {headers: {
                            'X-Requested-With': 'XmlHttpRequest'
                            // eslint-disable-next-line no-loop-func
                        }}).then((response) => response.text().then(responseText => {
                        const doc = new DOMParser().parseFromString(responseText, "text/html");
                        const searchSpan = doc.getElementsByTagName("span");
                        let found = false;
                        let channelName = 'Channel or video not available';
                        for (const s of searchSpan) {
                            if (s.getAttribute("itemprop") === "author") {
                                const searchLink = s.getElementsByTagName("link");
                                for (const l of searchLink) {
                                    if (l.getAttribute("itemprop") === "name") {
                                        channelName = l.getAttribute("content").toString();
                                        found = true;
                                        break;
                                    }
                                }
                                if (found) {
                                    break;
                                }
                            }
                        }
                        if (associativeData[channelName] === undefined) {
                            associativeData[channelName] = {Channel: channelName, Searched: 0, Advert: 0, Count: 0};
                        }
                        if (el.adv) {
                            associativeData[channelName].Advert++;
                        } else {
                            associativeData[channelName].Searched++;
                        }
                        associativeData[channelName].Count++;
                        queue--;
                        setProgress(normalize(list.length - queue, list.length));
                        if (queue === 0) {
                            const update = [];
                            let lSum = 0;
                            for (const d in associativeData) {
                                update.push(associativeData[d]);
                                lSum += associativeData[d].Count;
                            }
                            setSum(lSum);
                            setData(update);
                            setLoading(false);
                        }
                        // eslint-disable-next-line no-loop-func
                    }), () => {
                        enqueueSnackbar("Connection error! Couldn't reach URL.", {variant: "error"});
                        // TODO modularize to avoid duplicate lines
                        const channelName = "Rejected URL";
                        if (associativeData[channelName] === undefined) {
                            associativeData[channelName] = {Channel: channelName, Searched: 0, Advert: 0, Count: 0};
                        }
                        if (el.adv) {
                            associativeData[channelName].Advert++;
                        } else {
                            associativeData[channelName].Searched++;
                        }
                        associativeData[channelName].Count++;
                        queue--;
                        setProgress(normalize(list.length - queue, list.length));
                        if (queue === 0) {
                            const update = [];
                            let lSum = 0;
                            for (const d in associativeData) {
                                update.push(associativeData[d]);
                                lSum += associativeData[d].Count;
                            }
                            setSum(lSum);
                            setData(update);
                            setLoading(false);
                        }
                    });
                }
            }, () => {
                setLoading(false);
                enqueueSnackbar("Connection error! Couldn't reach the proxy.", {variant: "error"});
            })
        });
    }



    return <>
        <section>
            <Typography variant='h2' component='h3'>WebScraper</Typography>
        <div>

            <Alert severity='info'>Collect the names of the viewed channels! Number of collected entries: {sum}</Alert>

            <Box sx={{ m: 1, position: 'relative' }}>

                <Button startIcon={<TravelExploreIcon />} disabled={loading} variant = 'contained'
                        onClick={createDataForVisualization}>
                    Collect
                </Button>

                <Tooltip title={summarised ? 'Split by adverts' : 'Summarise counts'}>
                    <IconButton color='primary' sx={{m:2}} onClick={toggleSummarised}>
                        {summarised ? <StackedBarChartIcon /> : <FunctionsIcon />}
                    </IconButton>
                </Tooltip>

                <Tooltip title='Sort by Count value'>
                    <IconButton color='primary' sx={{m:2}} onClick={sortDataByCount} disabled={loading}>
                        <SortIcon />
                    </IconButton>
                </Tooltip>

                {loading && (progress > 0 ?
                        <CircularProgressWithLabel value={progress} /> :
                        <CircularProgress
                            size={32}
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                marginTop: '-16px',
                                marginLeft: '-16px',
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
                <XAxis dataKey="Channel" />
                <YAxis />
                <ReTooltip />
                <Legend />
                { summarised ? <Bar dataKey="Count" stackId="a" fill="#ad2e9f" /> :
                    <><Bar dataKey="Searched" stackId="b" fill="#694BFF" />
                        <Bar dataKey="Advert" stackId="b" fill="#F1103E" /></> }
            </BarChart>
        </div>
        </section>
    </>;
}
