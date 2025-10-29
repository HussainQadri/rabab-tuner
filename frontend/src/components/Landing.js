import React, { useEffect, useState } from "react";
import { gsap } from "gsap";
import { FaGithub } from "react-icons/fa";

export default function Landing({ onStart }) {
  const [displayed, setDisplayed] = useState("");
  const fullText = "Hello, Let's get your Rabab tuned.";

  useEffect(() => {
    let index = 0;
    let current = "";
    let timeoutId;

    const type = () => {
      if (index < fullText.length) {
        current += fullText.charAt(index);
        setDisplayed(current);
        index++;
        timeoutId = setTimeout(type, 70);
      } else {
        gsap.to([".landing button", ".github-link"], {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.2,
          ease: "power2.out",
        });
      }
    };

    type();
    return () => clearTimeout(timeoutId);
  }, []);

  const handleStart = () => {
    gsap.to(".landing h1, .landing button, .github-link", {
      opacity: 0,
      y: -20,
      duration: 0.6,
      onComplete: onStart,
    });
  };

  return (
    <div className="landing">
      <h1 className="typed-text">
        {displayed}
        {displayed.length < fullText.length && <span className="cursor">|</span>}
      </h1>

      <button onClick={handleStart}>Start</button>

      <a
        className="github-link"
        href="https://github.com/HussainQadri/rabab-tuner"
        target="_blank"
        rel="noreferrer"
      >
        <FaGithub size={28} />
      </a>
    </div>
  );
}
