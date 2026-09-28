/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { Dataset } from "../types";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * 本地分析引擎：当没有 API Key 时，通过规则计算提供基础洞察
 */
function getLocalInsights(dataset: Dataset): string[] {
  const insights: string[] = [];
  const measures = dataset.fields.filter(f => f.isMeasure);
  const data = dataset.data;

  if (data.length === 0) return ["暂无数据可供分析"];

  measures.slice(0, 3).forEach(measure => {
    const values = data.map(d => Number(d[measure.name])).filter(v => !isNaN(v));
    if (values.length > 0) {
      const max = Math.max(...values);
      const min = Math.min(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      insights.push(`${measure.name} 的最大值为 ${max.toLocaleString()}，最小值为 ${min.toLocaleString()}。`);
      insights.push(`${measure.name} 的平均数值约为 ${avg.toFixed(2)}。`);
    }
  });

  if (insights.length === 0) {
    insights.push("数据集中暂未发现明显的数值规律。");
  }

  insights.push(`当前数据集包含 ${data.length} 条记录，涉及 ${dataset.fields.length} 个字段。`);
  
  return insights;
}

export async function getSmartInsights(dataset: Dataset) {
  if (!dataset.data.length) return null;

  // 如果没有 API Key，使用本地引擎
  if (!ai || !apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("Using local statistics engine (No API Key found)");
    return getLocalInsights(dataset);
  }

  const sampleData = dataset.data.slice(0, 5);
  const fields = dataset.fields.map(f => `${f.name} (${f.type})`).join(', ');

  const prompt = `
    分析以下数据集结构和前5行数据：
    字段: ${fields}
    样本数据: ${JSON.stringify(sampleData)}

    请针对这些数据提供3条简短、可操作的洞察或有趣的发现。
    以 JSON 字符串数组格式输出。保持专业且具有技术性。
    仅输出 JSON 数组，不要包含其他解释。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    
    // @ts-ignore - The SDK types might be slightly out of sync but text property exists at runtime
    const text = response.text || '';
    const jsonMatch = text.match(/\[.*\]/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : (getLocalInsights(dataset));
  } catch (error) {
    console.error("Gemini Insights Error, falling back to local:", error);
    return getLocalInsights(dataset);
  }
}
