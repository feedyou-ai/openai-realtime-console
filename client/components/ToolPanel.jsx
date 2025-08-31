import { useEffect, useState } from "react";

const sessionUpdate = {
  type: "session.update",
  session: {
    instructions:
      "Řekni přesně: 'Děkuji, zapsáno. Přeji pěkný den!'",
    voice: "marin",
    temperature: 0.6,
    input_audio_transcription: {
      model: "whisper-1",
    },
    tools: [
      {
        type: "function",
        name: "get_appointment_slots",
        description:
          "Použij tuto funkci pro získání dostupných termínů, volitelně s filtrem daného dne.",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            date: {
              type: "string",
              description: "Preferované datum pro schůzku",
            },
          },
        },
      },
      {
        type: "function",
        name: "create_appointment",
        description:
          "Použij tuto funkci pro založení schůzky, povinná je volba data+času a volitelně poznámka",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            dateTime: {
              type: "string",
              description: "Vybrané datum a čas schůzky",
            },
            note: {
              type: "string",
              description: "Volitelná poznámka",
            },
          },
          required: ["dateTime"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutputs }) {
  return (
    <div className="flex flex-col gap-2">
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        <ul>
          {functionCallOutputs.map((output) => (
            <li>{JSON.stringify(output, null, 2)}</li>
          ))}
        </ul>
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutputs, setFunctionCallOutputs] = useState([]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      sendClientEvent({ type: "response.create" });
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        let args = {};
        try {
          args = JSON.parse(output.arguments || "{}");
        } catch (e) {
          console.warn("Failed to parse arguments", output);
        }

        if (
          output.type === "function_call" &&
          output.name === "get_appointment_slots"
        ) {
          setFunctionCallOutputs([...functionCallOutputs, output]);
          setTimeout(() => {
            sendClientEvent({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: output.call_id,
                output:
                  `{"slots": ["${args.date}T10:00:00","${args.date}T14:30:00"]}`
                  /*!args.date || args.date === "2025-02-25"*/
                  /*true
                    ? '{"slots": ["2025-02-2510:00:00","2025-02-25T14:30:00"]}'
                    : args.date === "2025-02-25" ? '{"slots": ["2025-02-2511:00:00","2025-02-25T15:30:00", "2025-02-25T17:00:00"]}' : '{"slots": []}',*/
              },
            });
            sendClientEvent({
              type: "response.create",
              response: {
                instructions:
                  "Dej uživateli na výběr jeden z navržených termínů [\"2025-02-2510:00:00\",\"2025-02-25T14:30:00\"]. Hodiny čti správně česky v prvním pádě např. 'v deset hodin', 've čtrnáct třicet' apod. Pokud nejsou žádné k dispozici tak požádej o jiný den případně o nejbližší možný. Nenebádej k výběru dní, pro které nemáš nalezené sloty.",
              },
            });
          }, 200);
        }

        if (
          output.type === "function_call" &&
          output.name === "create_appointment" &&
          args.dateTime
        ) {
          setFunctionCallOutputs([...functionCallOutputs, output]);
          setTimeout(() => {
            sendClientEvent({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: output.call_id,
                output: '{"selectedSlot": "' + args.dateTime + '"}',
              },
            });
            sendClientEvent({
              type: "response.create",
              response: {
                instructions:
                  "Finálně potvrď uživateli objednání na vybraný čas (čti česky v prvním pádě např. 'čtrnáct třicet') zeptej se jestli nechce něco přidat do poznámky. Pokud ano tak znovu zavolej funkci create_appointment, pokud ne tak se jen hezky rozluč.",
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutputs([]);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Tool outputs</h2>
        {isSessionActive ? (
          functionCallOutputs.length > 0 ? (
            <FunctionCallOutput functionCallOutputs={functionCallOutputs} />
          ) : (
            <p>Ask for advice on a color palette...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
