import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "./components/Landing";
import Tuner from "./components/Tuner";
import "./App.css";

function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="App">
      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <Landing onStart={() => setStarted(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="tuner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <Tuner />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
