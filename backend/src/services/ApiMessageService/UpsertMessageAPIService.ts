import ApiMessage from "../../models/ApiMessage";
import Ticket from "../../models/Ticket"; // Importe o modelo Ticket

interface MessageData {
  sessionId: number;
  messageId: string;
  body: string;
  ack: number;
  number: number;
  mediaName?: string;
  mediaUrl?: string;
  timestamp: number;
  externalKey: string;
  messageWA: object;
  apiConfig: object;
  tenantId: number;
}

const UpsertMessageAPIService = async ({
  sessionId,
  messageId,
  body,
  ack,
  number,
  mediaName,
  mediaUrl,
  timestamp,
  externalKey,
  messageWA,
  apiConfig,
  tenantId
}: MessageData): Promise<ApiMessage> => {
  let message;

  const messageExists = await ApiMessage.findOne({
    where: { messageId, tenantId }
  });

  if (messageExists) {
    await messageExists.update({
      sessionId,
      messageId,
      body,
      ack,
      number,
      mediaName,
      mediaUrl,
      timestamp,
      externalKey,
      messageWA,
      apiConfig,
      tenantId
    });
    message = await messageExists.reload();
  } else {
    message = await ApiMessage.create({
      sessionId,
      messageId,
      body,
      ack,
      number,
      mediaName,
      mediaUrl,
      timestamp,
      externalKey,
      messageWA,
      apiConfig,
      tenantId
    });
  }

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  // Encontre todos os tickets associados ao número de contato
  const tickets = await Ticket.findAll({
    where: { userId: number }
  });

  // Concatene os históricos de mensagens de todos os tickets
  let conversationHistory: any[] = [];
  tickets.forEach(ticket => {
    conversationHistory = conversationHistory.concat(ticket.messages);
  });

  // Adicione a nova mensagem ao histórico completo de mensagens
  conversationHistory.push({
    sender: 'user',
    message: body,
    timestamp: new Date(timestamp)
  });

  // Salve o histórico completo no ticket mais recente
  const latestTicket = tickets.reduce((prev, current) => (prev.createdAt > current.createdAt) ? prev : current);
  if (latestTicket) {
    latestTicket.messages = conversationHistory;
    await latestTicket.save();
  }

  return message;
};

export default UpsertMessageAPIService;
