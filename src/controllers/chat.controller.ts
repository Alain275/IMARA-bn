import { NextFunction, Request, Response } from 'express';
import { generateChatReply, validateChatMessages } from '../services/chatService';

function writeStream(res: Response, text: string) {
  const chunks = text.match(/\S+\s*/g) || [text];

  for (const chunk of chunks) {
    res.write(chunk);
  }
}

export const sendChatMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = validateChatMessages(req.body?.messages);
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : undefined;
    const completion = await generateChatReply(messages, provider);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Chat-Provider', completion.provider);
    res.setHeader('X-Chat-Model', completion.model);
    res.flushHeaders();

    writeStream(res, completion.text);
    res.end();
  } catch (error) {
    next(error);
  }
};
