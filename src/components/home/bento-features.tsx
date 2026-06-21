"use client"

import { motion } from "framer-motion"
import { CalendarCheck, LineChart, Bot } from "lucide-react"

const features = [
  {
    title: "Book your seat hassle free",
    description: "Skip the queues and confusion. Reserve your seat instantly with a smooth booking experience.",
    icon: CalendarCheck,
    className: "bg-slate-50 border border-border shadow-sm",
    iconColor: "text-blue-600"
  },
  {
    title: "Tracking daily progress",
    description: "Stay on top of your routine with clear, consistent tracking - every day, without effort.",
    icon: LineChart,
    className: "bg-slate-50 border border-border shadow-sm",
    iconColor: "text-orange-500"
  },
  {
    title: "Mentor Support & AI",
    description: "Access real mentors and AI-powered tools designed to support your daily progress.",
    icon: Bot,
    className: "bg-slate-50 border border-border shadow-sm",
    iconColor: "text-teal-500"
  }
]

export function BentoFeatures() {
  return (
    <section className="py-24 bg-white relative">
      <div className="container max-w-[1300px] mx-auto px-6 md:px-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight font-heading text-slate-900"
          >
            Why Choose <span className="text-primary">FocusX</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Everything you need to crack your exams, designed perfectly into every library on our platform.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[220px]">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group ${feature.className}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${feature.className.includes('bg-slate-900') ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-100'} z-10`}>
                <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
              </div>
              
              <div className="z-10 mt-6">
                <h3 className={`text-2xl font-bold mb-2 ${feature.className.includes('text-white') ? 'text-white' : 'text-slate-900'}`}>
                  {feature.title}
                </h3>
                <p className={`${feature.className.includes('text-white') ? 'text-slate-300' : 'text-slate-600'} leading-relaxed max-w-sm`}>
                  {feature.description}
                </p>
              </div>

              {/* Decorative background glow for the large dark card */}
              {feature.className.includes('bg-slate-900') && (
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-150" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
