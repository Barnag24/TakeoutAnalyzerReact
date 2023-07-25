import "./App.css";
import React from "react";
import { DBConfig } from './DBConfig';
import { initDB } from 'react-indexed-db';
import SubscriberInfoAnalyzer from "./SubscriberInfoAnalyzer";
import YouTubeHistoryAnalyzer from "./YouTubeHistoryAnalyzer";
import Webscraper from "./Webscraper";
import { SnackbarProvider } from 'notistack';
/* To enable MUI fonts
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
*/

initDB(DBConfig);

export default function App() {

  return (
      <SnackbarProvider maxSnack={3}>
        <SubscriberInfoAnalyzer />
        <YouTubeHistoryAnalyzer />
        <Webscraper />
      </SnackbarProvider>
  );
}
