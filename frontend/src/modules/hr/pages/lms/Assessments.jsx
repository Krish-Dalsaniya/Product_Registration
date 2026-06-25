import React from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

const Assessments = () => {
    return (
        <div className="p-6 h-full flex flex-col items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
            >
                <div className="w-20 h-20 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Award className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Assessments & Results</h2>
                <p className="text-[var(--text-muted)] leading-relaxed">
                    This section will be used to manage post-training assessments, quizzes, and grading. 
                    It is currently marked for future development.
                </p>
            </motion.div>
        </div>
    );
};

export default Assessments;
