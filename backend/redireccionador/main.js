const axios = require("axios");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const io = require("socket.io")(3002, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  io.emit("console_log", args.join(" "));
  originalConsoleLog.apply(console, args);
};

console.error = function (...args) {
  io.emit("console_error", args.join(" "));
  originalConsoleError.apply(console, args);
};

const { generateRustSmartContract } = require(path.join(__dirname,"../rustBranch/js/main"));
const { handleQuery } = require(path.join(__dirname, "../ragBranch/index")); // Importa la función handleQuery
const apiKey = process.env.OPENAI_API_KEY;

// Función para generar una instrucción concisa usando un LLM

async function generateConciseInstruction(input) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an AI that specializes in summarizing and condensing complex instructions. The user will provide a detailed task, and your job is to generate a concise and clear instruction that can be used to create a smart contract. Answer only with the instruction.",
          },
          { role: "user", content: input },
        ],
        max_tokens: 150,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const conciseInstruction = response.data.choices[0].message.content.trim();
    return conciseInstruction;
  } catch (error) {
    console.error("Error generating concise instruction:", error);
    throw error;
  }
}

async function codigoSOLANA(input) {
  try {
    console.log(
      "Generating concise instruction for smart contract in rust for Soon Network..."
    );

    // Generar instrucción concisa
    const conciseInstruction = await generateConciseInstruction(input);
    // console.log(`Concise Instruction: ${conciseInstruction}`);

    // Llamar a la función generateSmartContract con la instrucción concisa
    const { rustCode, finalConclusion } = await generateRustSmartContract(
      conciseInstruction
    );

    return `Código Rust Generado:\n${rustCode}\n\nConclusión:\n${finalConclusion}`;
  } catch (error) {
    console.error("Error in RustCode:", error);
    throw error;
  }
}

async function RAGMODEL(input) {
  try {
    console.log("Ejecutando RAGMODEL...");

    // Utilizar la función handleQuery de ragBranch
    const result = await handleQuery(input);
    return "Usando RAGMODEL";
  } catch (error) {
    console.error("Error in RAGMODEL:", error);
    throw error;
  }
}

async function normalModel(prompt) {
  return " ";
}

// Función que determina la acción a tomar basada en el input del usuario
async function generateMessage(prompt) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
            You are an AI model specialized in blockchain technology. Based on the user's input, you need to indicate one or more of the following actions that need to be executed:
            Analyze the input and decide the appropriate actions, returning the responses as an array of options ONLY ANSWER WITH THE ARRAY.
            You can return multiple responses if necessary.

            1. If the input involves a problem or request that requires Solana code, add 1 to the array.
            2. If the input is a specific question related to blockchain, smart contracts, or related technologies, add 2 to the array.
            3. If the input is a question of another subject, add 3 to the array.
          `,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 10,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const answer = response.data.choices[0].message.content.trim();
    const numberArray = JSON.parse(answer);
    return numberArray;
  } catch (error) {
    console.log("Error:", error);
    return null;
  }
}

// Función para formatear la respuesta final
async function formatResponse(input, result) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
            You are an AI model specialized in generating well-formatted and cohesive text. The user will provide some raw output and an input, and your job is to format the raw output into a polished final response.
            The final response should be clear, well-structured, and appropriately formatted.
          `,
          },
          { role: "user", content: `Input: ${input}` },
          { role: "user", content: `Raw Output: ${result}` },
        ],
        max_tokens: 1000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const formattedResponse = response.data.choices[0].message.content.trim();
    return formattedResponse;
  } catch (error) {
    console.log("Error en el formateador:", error);
    return result; // En caso de error, devuelve el resultado sin formatear.
  }
}

async function processInput(input) {
  const answer = await generateMessage(input);
  let result = "";
  if (answer == null){
    return;
  }
  if (answer.includes(1)) {
    result += (await codigoSOLANA(input)) + "/n";
  }
  if (answer.includes(2)) {
    result += (await RAGMODEL(input)) + "/n";
  }
  if (answer.includes(3)) {
    result += (await normalModel(input)) + "/n";
  }

  // Formatear la respuesta final
  const finalResponse = await formatResponse(input, result.trim());
  return finalResponse;
}

// Función asíncrona para ejecutar el código y mostrar el resultado
// async function run() {
//   const response = await processInput("");
//   console.log(response);
// }

// run();

// Exportar la función
module.exports = { processInput };