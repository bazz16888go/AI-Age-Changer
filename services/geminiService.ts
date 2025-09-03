import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// The API key must be set in the environment variables as process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const parseDataUrl = (dataUrl: string): { mimeType: string; data: string } => {
  const parts = dataUrl.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const data = parts[1];
  return { mimeType, data };
};

export const editImage = async (
  base64ImageDataUrl: string,
  prompt: string
): Promise<string> => {
  try {
    const { mimeType, data } = parseDataUrl(base64ImageDataUrl);

    if (!mimeType.startsWith('image/')) {
      throw new Error('無效的圖片格式');
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    const candidate = response.candidates?.[0];

    if (!candidate) {
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
            throw new Error(`請求被阻擋，原因: ${blockReason}。請調整您的圖片或提示。`);
        }
        throw new Error("AI 未返回有效的候選結果。");
    }

    if (candidate.finishReason !== 'STOP') {
        let userMessage = `圖片生成失敗。`;
        if (candidate.finishReason === 'SAFETY') {
            userMessage += ` 請求可能違反了安全政策。`;
            const blockedRating = candidate.safetyRatings?.find(r => r.blocked);
            if(blockedRating) {
                userMessage += ` (類別: ${blockedRating.category})`
            }
        } else {
            userMessage += ` 終止原因: ${candidate.finishReason}。`;
        }
        console.error("Gemini API request failed:", response);
        throw new Error(userMessage);
    }
    
    const imagePart = candidate.content?.parts?.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));

    if (imagePart?.inlineData) {
        const newImageData = imagePart.inlineData.data;
        const newMimeType = imagePart.inlineData.mimeType;
        return `data:${newMimeType};base64,${newImageData}`;
    }
    
    const textPart = candidate.content?.parts?.find(part => part.text);
    if (textPart?.text) {
        console.warn("Gemini API returned text instead of an image:", textPart.text);
        throw new Error(`AI 返回了文字而不是圖片: "${textPart.text}"`);
    }

    throw new Error("AI未能生成圖片，雖然API請求成功，但回應中不包含圖片資料。");

  } catch (error) {
    console.error("Error editing image with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`圖片生成失敗: ${error.message}`);
    }
    throw new Error("發生未知錯誤，無法生成圖片。");
  }
};
