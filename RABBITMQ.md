docker run -p 5672:5672 -p 15672:15672 rabbitmq:4-management


- 5672 — AMQP (worker connection)
- 15672 — Management UI (http://localhost:15672, guest/guest)
- Connection URL: amqp://guest:guest@localhost:5672/
Note: Make sure the rabbitmq:4-management image includes the management plugin, or use rabbitmq:3-management / rabbitmq:latest. The *-management tags include the web UI.
