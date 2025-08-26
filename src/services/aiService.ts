// /src/services/aiService.ts

// TODO: Integrate with a real AI API like OpenAI, and add API key management.

/**
 * Formats the raw text from AI into a structured course object.
 * This is a helper function for generateFakeCourse.
 */
function formatCourseData(rawText: string) {
  // In a real implementation, you would parse the rawText more robustly.
  // This is a simple placeholder implementation.
  const lines = rawText.trim().split('\n');
  const title = lines.find(line => line.includes("标题"))?.split('：')[1]?.trim() || "AI生成课程";
  const instructorName = lines.find(line => line.includes("讲师姓名"))?.split('：')[1]?.trim() || "AI 讲师";
  const instructorBio = lines.find(line => line.includes("简介"))?.split('：')[1]?.trim() || "一位经验丰富的AI生成讲师。";

  const chapters = lines.filter(line => line.match(/^\d\./)).map(line => line.replace(/^\d\.\s*/, ''));

  return {
    title,
    instructor: {
      name: instructorName,
      bio: instructorBio,
    },
    chapters,
    description: `一门关于${title}的综合性课程。`,
  };
}

/**
 * Generates a fake course using an AI model.
 * This is based on the pseudo-code from the technical document.
 */
export async function generateFakeCourse(industry: string) {
  const prompt = `生成${industry}行业的中级课程，包含标题、3个章节、讲师姓名及简介`;

  console.log("Generating fake course with prompt:", prompt);

  // This is where you would call the OpenAI API.
  // const response = await openai.createCompletion({
  //   model: "text-davinci-003",
  //   prompt: prompt,
  //   max_tokens: 500
  // });
  // const rawText = response.data.choices[0].text;

  // For now, we'll use a hardcoded response to simulate the AI.
  const simulatedRawText = `
    课程标题：${industry}的数字化转型策略
    1. 数字化核心技术
    2. 数据驱动决策
    3. 业务流程自动化
    讲师姓名：李明
    讲师简介：超过10年经验的数字化转型专家。
  `;

  // In a real app, you would use the line below
  // return formatCourseData(rawText);
  return formatCourseData(simulatedRawText);
}

/**
 * Verifies a face using a facial recognition AI service.
 * NOTE: This is a mocked implementation.
 * @param userId The ID of the user to verify.
 * @param base64Image The base64 encoded image data from the user's camera.
 * @returns A promise that resolves to a mock verification result.
 */
export async function verifyFace(userId: string, base64Image: string) {
  console.log(`Verifying face for user ${userId} with image data (first 50 chars):`, base64Image.substring(0, 50) + "...");

  // In a real implementation, you would send the base64Image and userId
  // to an AI service provider like Baidu AI, AWS Rekognition, etc.
  // The service would look up the user's registered face template and compare.
  // const response = await fetch('https://api.aifaceservice.com/verify', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
  //   body: JSON.stringify({ userId, image: base64Image })
  // });
  // const result = await response.json();
  // return result;

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock a successful response
  console.log("Mock AI service response: { success: true, user: 'mockUser' }");
  return {
    success: true,
    user: 'mockUser', // In a real scenario, this might be a user ID.
  };
}
