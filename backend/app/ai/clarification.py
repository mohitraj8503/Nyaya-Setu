from typing import Optional, Tuple

class ClarificationEngine:
    def evaluate(self, text: str, category: str, confidence: float, language: str = "hi") -> Tuple[bool, Optional[str]]:
        """
        Evaluate if single-question clarification is needed.
        Instead of a 20-question form, generate 1 precise context-aware question.
        """
        if confidence >= 0.75 and len(text.strip().split()) >= 6:
            return False, None
            
        questions_by_category = {
            "roads_potholes": {
                "hi": "क्या यह समस्या मुख्य सड़क पर है या कॉलोनी की आंतरिक गली में, और क्या इससे यातायात पूरी तरह बाधित हो रहा है?",
                "en": "Is this issue located on a main arterial road or an internal colony lane, and is traffic completely blocked?",
                "mr": "हा खड्डा मुख्य रस्त्यावर आहे की अंतर्गत गल्लीत आहे?"
            },
            "garbage_collection": {
                "hi": "क्या कचरा खुले मैदान में डंप किया जा रहा है या आवासीय घरों के सामने कूड़ेदान भर गया है?",
                "en": "Is the uncollected waste openly dumped on public land or is it an overflowing bin in front of houses?",
                "mr": "कचरा उघड्या मैदानावर साचला आहे की घरांसमोर कचराकुंडी भरली आहे?"
            },
            "cyber_fraud": {
                "hi": "क्या धोखाधड़ी यूपीआई/बैंक खाते से हुई है, और क्या आपने तुरंत 1930 हेल्पलाइन पर कॉल किया है?",
                "en": "Did the unauthorized transaction occur via UPI/Bank Account, and have you reported it to 1930 Helpline?",
                "mr": "ही फसवणूक यूपीआय किंवा बँक खात्यातून झाली आहे का?"
            },
            "food_adulteration": {
                "hi": "क्या यह किसी रेस्टोरेंट का खाना है या पैकेटबंद उत्पाद? कृपया भोजनालय या ब्रांड का नाम बताएं।",
                "en": "Is this concerning a restaurant eatery or packaged food? Please specify the outlet or brand name.",
                "mr": "ही तक्रार हॉटेलच्या अन्नाबाबत आहे की पॅकबंद वस्तूबाबत?"
            }
        }
        
        cat_questions = questions_by_category.get(category, {
            "hi": "कृपया समस्या का सटीक स्थान और क्या तत्काल खतरा है, संक्षेप में स्पष्ट करें।",
            "en": "Please clarify the exact landmark/location and if there is an immediate hazard.",
            "mr": "कृपया समस्येचे नेमके ठिकाण आणि धोका स्पष्ट करा."
        })
        
        question = cat_questions.get(language, cat_questions["hi"])
        return True, question

clarification_engine = ClarificationEngine()
