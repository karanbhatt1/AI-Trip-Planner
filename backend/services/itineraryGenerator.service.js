import { execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ragMainPath = path.resolve(__dirname, "../RAG_Service/main.py");

const resolvePythonExecutable = () => {
  if (process.env.PYTHON_EXECUTABLE) {
    return process.env.PYTHON_EXECUTABLE;
  }

  const candidateExecutables = [
    path.resolve(__dirname, "../RAG_Service/venv/Scripts/python.exe"),
    path.resolve(__dirname, "../RAG_Service/venv/bin/python"),
  ];

  for (const executablePath of candidateExecutables) {
    if (fs.existsSync(executablePath)) {
      return executablePath;
    }
  }

  return "python";
};

const parsePythonJson = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const generateItineraryFromPython = (payload) =>
  new Promise((resolve, reject) => {
    const pythonExecutable = resolvePythonExecutable();
    const pythonTimeoutMs = Number(process.env.PYTHON_GENERATOR_TIMEOUT_MS || 120000);

    const child = execFile(
      pythonExecutable,
      [ragMainPath],
      { timeout: pythonTimeoutMs, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const stderrText = stderr?.toString()?.trim();
          const stdoutText = stdout?.toString()?.trim();
          const timedOut = error.killed && String(error.message || "").toLowerCase().includes("timeout");
          const timeoutHint = timedOut
            ? `Python itinerary generation timed out after ${pythonTimeoutMs}ms. Consider reducing embedding workload or increasing PYTHON_GENERATOR_TIMEOUT_MS.`
            : "";
          reject(
            new Error(
              stderrText ||
                stdoutText ||
                timeoutHint ||
                `Python itinerary generation failed: ${error.message}`
            )
          );
          return;
        }

        const parsed = parsePythonJson(stdout?.toString());
        if (!parsed) {
          reject(new Error("Python itinerary generator returned invalid JSON."));
          return;
        }

        if (parsed.error) {
          reject(new Error(parsed.error));
          return;
        }

        resolve(parsed);
      }
    );

    child.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
