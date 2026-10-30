# HSXZ Solutions — Obrigado pela sua compra! 💙

Olá! Agradecemos por escolher a **HSXZ Solutions**!

É um prazer ter você como cliente. Esperamos que nosso Bot de Tickets facilite o atendimento do seu servidor e proporcione uma experiência mais organizada e profissional para sua comunidade.

Abaixo você encontrará todas as instruções necessárias para instalar, configurar e utilizar o bot.

---

## 📦 1. Requisitos

Antes de começar, certifique-se de que possui:

- Node.js versão 18.17 ou superior.
- Um servidor Discord onde você tenha permissão de administrador.
- Uma aplicação e um bot criados no Discord Developer Portal.
- Acesso ao terminal ou console da hospedagem.

## ⚙️ 2. Instalação

**Passo 1 — Configurar o arquivo .env**

Na pasta do bot, localize o arquivo `.env.example`.

Faça uma cópia e renomeie para `.env`.

Abra o arquivo e preencha as seguintes informações:

- `TOKEN`: Token do seu bot Discord.
- `CLIENT_ID`: ID da aplicação do bot.
- `GUILD_ID`: ID do servidor onde o bot será utilizado.

**Atenção:** Nunca compartilhe seu TOKEN com outras pessoas. Ele permite acesso ao seu bot.

**Passo 2 — Ativar as permissões necessárias**

Acesse o [Discord Developer Portal](https://discord.com/developers/applications).

1. Selecione sua aplicação.
2. Entre na aba **Bot**.
3. Localize **Privileged Gateway Intents**.
4. Ative o **Message Content Intent**.
5. Salve as alterações.

Essa configuração é necessária para que o bot consiga ler o conteúdo das mensagens e gerar os transcripts corretamente.

**Passo 3 — Convidar o bot**

Na seção OAuth2 do Developer Portal, gere um convite utilizando os seguintes escopos:

- `bot`
- `applications.commands`

Conceda as seguintes permissões:

- Gerenciar Canais.
- Ver Canais.
- Enviar Mensagens.
- Incorporar Links.
- Anexar Arquivos.
- Ler Histórico de Mensagens.
- Gerenciar Mensagens.

Depois, adicione o bot ao seu servidor.

**Passo 4 — Iniciar o bot**

Abra o terminal dentro da pasta do projeto e execute os comandos abaixo, um por vez:

```bash
npm install
npm run deploy
npm start
```

Pronto! Se tudo estiver configurado corretamente, seu bot estará online.

---

## 🛠️ 3. Configuração inicial

Após iniciar o bot, utilize os comandos abaixo no seu servidor Discord.

Recomendamos seguir esta ordem:

**1. Configurar a categoria**
`/config categoria`

Define onde os canais de atendimento serão criados.

**2. Configurar a equipe**
`/config staff`

Define o cargo responsável pelo atendimento dos tickets.

**3. Configurar os registros**
`/config logs`

Define o canal que receberá os registros e transcripts dos atendimentos.

**4. Criar o painel**
`/painel`

Publica o painel para que os membros possam abrir seus próprios tickets.

### Outros comandos disponíveis

| Comando | Função |
|---|---|
| `/config max` | Define o limite de tickets por usuário. |
| `/config marca` | Personaliza o nome da loja nos embeds. |
| `/config painel` | Personaliza título, descrição, cor, botão, emoji, rodapé e imagem. |
| `/config tipo adicionar` | Adiciona um tipo de atendimento. |
| `/config tipo remover` | Remove um tipo de atendimento. |
| `/config tipo listar` | Lista os tipos cadastrados. |
| `/config ver` | Exibe as configurações atuais. |
| `/ticket adicionar` | Adiciona uma pessoa ao ticket. |
| `/ticket remover` | Remove uma pessoa do ticket. |

---

## 📎 4. Sistema de anexos

O bot possui suporte para anexos durante a abertura dos tickets.

O formulário permite enviar até **5 arquivos**.

Os arquivos enviados são encaminhados para dentro do canal privado do atendimento.

Caso sua versão do Discord ou do discord.js não permita anexos diretamente pelo formulário, o usuário poderá enviar os arquivos normalmente após a criação do ticket.

---

## 🎫 5. Como funciona o atendimento?

O funcionamento é simples e automatizado:

1. O cliente acessa o painel e clica em **Abrir Ticket**.
2. Escolhe o tipo de atendimento.
3. Preenche o assunto e a descrição, podendo adicionar arquivos.
4. O bot cria automaticamente um canal privado.
5. A equipe recebe uma notificação e pode clicar em **Assumir**.
6. Quando o atendimento terminar, o cliente ou um membro da equipe poderá clicar em **Fechar**.
7. O bot gera o transcript da conversa e envia para o canal de logs.
8. O cliente recebe uma notificação por mensagem privada.
9. Após a finalização, o canal do ticket é excluído.

---

## 💾 6. Armazenamento e backup

As configurações do servidor ficam armazenadas no arquivo:

`data/guilds.json`

Recomendamos manter uma cópia de segurança desse arquivo para evitar a perda das configurações em caso de reinstalação ou manutenção.

---

## 🧪 7. Testes

Para executar os testes do projeto, utilize:

```bash
npm test
```

---

## 💙 Agradecimento especial

Mais uma vez, muito obrigado por adquirir um produto da **HSXZ Solutions**!

Desenvolvemos este projeto pensando em praticidade, organização e eficiência para o seu servidor Discord.

Esperamos que o bot atenda às suas expectativas e contribua para melhorar a experiência dos seus clientes.

**Precisa de ajuda?**

Caso tenha dúvidas durante a instalação ou configuração, entre em contato com o suporte da HSXZ Solutions

**HSXZ Solutions**  

