import { ROOMS } from "./rooms"

export interface Word {
  id: string
  lemma: string
  ipa: string
  pos: "n." | "v." | "adj."
  gloss: string
  example: string
  roomId: string
}

function w(
  roomId: string,
  lemma: string,
  ipa: string,
  pos: Word["pos"],
  gloss: string,
  example: string,
): Word {
  return {
    id: lemma.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    lemma,
    ipa,
    pos,
    gloss,
    example,
    roomId,
  }
}

export const WORDS: readonly Word[] = [
  w("threshold", "ubiquitous", "juːˈbɪkwɪtəs", "adj.", "无处不在的", "Smartphones have become ubiquitous on college campuses."),
  w("threshold", "ambiguous", "æmˈbɪɡjuəs", "adj.", "模棱两可的", "The ending is ambiguous, and readers still disagree."),
  w("threshold", "pragmatic", "præɡˈmætɪk", "adj.", "务实的", "A pragmatic plan may be less elegant but easier to fund."),
  w("threshold", "coherent", "koʊˈhɪrənt", "adj.", "连贯的；一致的", "Each paragraph keeps the essay coherent."),
  w("threshold", "plausible", "ˈplɔːzəbl", "adj.", "貌似合理的", "The hypothesis is plausible, though the evidence is thin."),
  w("threshold", "inherent", "ɪnˈhɪrənt", "adj.", "固有的", "Some risk is inherent in a long field study."),
  w("threshold", "profound", "prəˈfaʊnd", "adj.", "深刻的", "The book had a profound effect on later policy."),
  w("threshold", "arbitrary", "ˈɑːrbɪtreri", "adj.", "任意的；武断的", "The cutoff looked arbitrary to the applicants."),
  w("threshold", "comprehensive", "ˌkɑːmprɪˈhensɪv", "adj.", "全面的", "The report is a comprehensive review of the decade."),
  w("threshold", "meticulous", "məˈtɪkjələs", "adj.", "一丝不苟的", "She kept meticulous notes of every trial."),
  w("threshold", "compelling", "kəmˈpelɪŋ", "adj.", "令人信服的", "The lawyer made a compelling case for new standards."),
  w("threshold", "prevalent", "ˈprevələnt", "adj.", "普遍的", "This bias is prevalent in self-reported surveys."),

  w("library", "advocate", "ˈædvəkeɪt", "v.", "倡导；主张", "Several scholars advocate delaying the reform."),
  w("library", "refute", "rɪˈfjuːt", "v.", "反驳", "The author tries to refute the earlier explanation."),
  w("library", "assert", "əˈsɜːrt", "v.", "断言", "The paper asserts that sleep shapes memory more than diet."),
  w("library", "imply", "ɪmˈplaɪ", "v.", "暗示", "The tone implies doubt even when the claim is direct."),
  w("library", "concede", "kənˈsiːd", "v.", "承认（常指让步）", "The mayor conceded that the first plan had failed."),
  w("library", "substantiate", "səbˈstænʃieɪt", "v.", "证实", "The study failed to substantiate the bold headline."),
  w("library", "articulate", "ɑːrˈtɪkjuleɪt", "v.", "清晰地表达", "Candidates must articulate a position in the interview."),
  w("library", "juxtapose", "ˌdʒʌkstəˈpoʊz", "v.", "并置", "The exhibit juxtaposes rural photographs with factory portraits."),
  w("library", "paraphrase", "ˈpærəfreɪz", "v.", "改述", "Paraphrase the paragraph before you critique it."),
  w("library", "scrutinize", "ˈskruːtənaɪz", "v.", "仔细审查", "Editors scrutinize every citation before publication."),
  w("library", "bolster", "ˈboʊlstər", "v.", "支持；加强", "New data bolster the original argument."),
  w("library", "undermine", "ˌʌndərˈmaɪn", "v.", "削弱", "Rumors can undermine trust in public institutions."),

  w("laboratory", "hypothesis", "haɪˈpɑːθəsɪs", "n.", "假说", "The hypothesis predicted a sharp drop in reaction time."),
  w("laboratory", "empirical", "ɪmˈpɪrɪkl", "adj.", "实证的", "Empirical results contradicted the textbook model."),
  w("laboratory", "variable", "ˈveriəbl", "n.", "变量", "Temperature was the only variable the team changed."),
  w("laboratory", "correlate", "ˈkɔːrəleɪt", "v.", "相关联", "Income does not always correlate with reported happiness."),
  w("laboratory", "synthesize", "ˈsɪnθəsaɪz", "v.", "综合；合成", "The review synthesizes findings from forty studies."),
  w("laboratory", "catalyst", "ˈkætəlɪst", "n.", "催化剂；促进因素", "An enzyme acted as the catalyst for the reaction."),
  w("laboratory", "disseminate", "dɪˈsemɪneɪt", "v.", "传播", "Agencies disseminate storm warnings by radio and text."),
  w("laboratory", "quantitative", "ˈkwɑːntəteɪtɪv", "adj.", "定量的", "Quantitative data made the trend easier to compare."),
  w("laboratory", "phenomenon", "fɪˈnɑːmɪnən", "n.", "现象", "The aurora is a natural phenomenon, not a warning."),
  w("laboratory", "anomaly", "əˈnɑːməli", "n.", "异常", "An anomaly in the sample forced the lab to rerun the test."),
  w("laboratory", "replicate", "ˈreplɪkeɪt", "v.", "复制（实验结果）", "Other labs could not replicate the result."),
  w("laboratory", "mitigate", "ˈmɪtɪɡeɪt", "v.", "减轻", "Trees along the river help mitigate flood damage."),

  w("forum", "consensus", "kənˈsensəs", "n.", "共识", "The committee reached a consensus after three meetings."),
  w("forum", "autonomy", "ɔːˈtɑːnəmi", "n.", "自治；自主", "The region demanded greater autonomy over its schools."),
  w("forum", "legislation", "ˌledʒɪsˈleɪʃn", "n.", "立法；法律", "New legislation limits how long ballots may be counted."),
  w("forum", "equity", "ˈekwəti", "n.", "公平", "Equity requires more than treating every case alike."),
  w("forum", "bureaucracy", "bjʊˈrɑːkrəsi", "n.", "官僚体制", "The form disappeared into a slow bureaucracy."),
  w("forum", "demographic", "ˌdeməˈɡræfɪk", "adj.", "人口统计的", "Demographic change is reshaping the neighborhoods."),
  w("forum", "ideology", "ˌaɪdiˈɑːlədʒi", "n.", "意识形态", "The movement was driven by a clear ideology."),
  w("forum", "mandate", "ˈmændeɪt", "n.", "授权；命令", "The election was read as a mandate for tax reform."),
  w("forum", "sovereignty", "ˈsɑːvrənti", "n.", "主权", "The treaty respects each nation's sovereignty."),
  w("forum", "coalition", "ˌkoʊəˈlɪʃn", "n.", "联盟", "A coalition of small parties blocked the bill."),
  w("forum", "disparity", "dɪˈspærəti", "n.", "差异；悬殊", "The disparity in funding between districts remains large."),
  w("forum", "civic", "ˈsɪvɪk", "adj.", "公民的；市政的", "Voting is a civic duty, not only a personal choice."),

  w("atelier", "aesthetic", "esˈθetɪk", "adj.", "审美的", "The building's aesthetic is spare, almost severe."),
  w("atelier", "narrative", "ˈnærətɪv", "n.", "叙事", "The narrative shifts between two generations."),
  w("atelier", "motif", "moʊˈtiːf", "n.", "主题；反复出现的意象", "Water is a recurring motif in the poems."),
  w("atelier", "evoke", "ɪˈvoʊk", "v.", "唤起", "The photograph evokes the quiet of an empty station."),
  w("atelier", "nuanced", "ˈnuːɑːnst", "adj.", "有细微差别的", "Her critique is nuanced rather than simply positive."),
  w("atelier", "satire", "ˈsætaɪər", "n.", "讽刺作品", "The play is a satire of celebrity culture."),
  w("atelier", "allegory", "ˈæləɡɔːri", "n.", "寓言；讽喻", "The novel can be read as an allegory of exile."),
  w("atelier", "composition", "ˌkɑːmpəˈzɪʃn", "n.", "构图；作品", "The composition leads the eye toward the open door."),
  w("atelier", "avant-garde", "ˌævɑːnt ˈɡɑːrd", "adj.", "先锋的", "The film was too avant-garde for a wide release."),
  w("atelier", "imagery", "ˈɪmɪdʒri", "n.", "意象", "The imagery of winter returns in the final chapter."),
  w("atelier", "cadence", "ˈkeɪdns", "n.", "节奏；抑扬", "The sentence ends with a falling cadence."),
  w("atelier", "vernacular", "vərˈnækjələr", "n.", "白话；方言", "He wrote in the vernacular, not in formal prose."),

  w("archive", "chronicle", "ˈkrɑːnɪkl", "n.", "编年史", "The chronicle records droughts alongside coronations."),
  w("archive", "epoch", "ˈepək", "n.", "时代", "The invention marked a new epoch in communication."),
  w("archive", "legacy", "ˈleɡəsi", "n.", "遗产；遗留影响", "The scholarship is her legacy to the field."),
  w("archive", "artifact", "ˈɑːrtɪfækt", "n.", "人工制品", "The artifact was dated to the third century."),
  w("archive", "precedent", "ˈpresɪdənt", "n.", "先例", "The ruling set a precedent for later cases."),
  w("archive", "dynasty", "ˈdaɪnəsti", "n.", "王朝", "The dynasty ruled the valley for two hundred years."),
  w("archive", "relic", "ˈrelɪk", "n.", "遗物", "The museum returned the relic to its community."),
  w("archive", "chronology", "krəˈnɑːlədʒi", "n.", "年表；年代顺序", "The chronology of the letters is still disputed."),
  w("archive", "hegemony", "hɪˈdʒeməni", "n.", "霸权", "Naval hegemony let the empire tax distant ports."),
  w("archive", "antiquity", "ænˈtɪkwəti", "n.", "古代", "Texts from antiquity still shape legal language."),
  w("archive", "lineage", "ˈlɪniɪdʒ", "n.", "谱系；血统", "The lineage of the idea can be traced to one essay."),
  w("archive", "upheaval", "ʌpˈhiːvl", "n.", "剧变", "The war caused a social upheaval that outlasted the fighting."),

  w("observatory", "ecosystem", "ˈiːkoʊsɪstəm", "n.", "生态系统", "A reef is a delicate ecosystem."),
  w("observatory", "biodiversity", "ˌbaɪoʊdaɪˈvɜːrsəti", "n.", "生物多样性", "Biodiversity dropped after the wetland was drained."),
  w("observatory", "arid", "ˈærɪd", "adj.", "干旱的", "Crops fail quickly in an arid climate."),
  w("observatory", "erosion", "ɪˈroʊʒn", "n.", "侵蚀", "Erosion carried the hillside into the stream."),
  w("observatory", "habitat", "ˈhæbɪtæt", "n.", "栖息地", "The marsh is a habitat for migrating birds."),
  w("observatory", "sustainable", "səˈsteɪnəbl", "adj.", "可持续的", "Sustainable fishing keeps the stock from collapsing."),
  w("observatory", "precipitation", "prɪˌsɪpɪˈteɪʃn", "n.", "降水", "Precipitation was half the seasonal average."),
  w("observatory", "fauna", "ˈfɔːnə", "n.", "动物群", "The island's fauna includes several rare lizards."),
  w("observatory", "flora", "ˈflɔːrə", "n.", "植物群", "Alpine flora blooms for only a few weeks."),
  w("observatory", "glacier", "ˈɡleɪʃər", "n.", "冰川", "The glacier has retreated hundreds of meters."),
  w("observatory", "nutrient", "ˈnuːtriənt", "n.", "养分", "The soil lacked a key nutrient."),
  w("observatory", "indigenous", "ɪnˈdɪdʒənəs", "adj.", "本土的；土著的", "Indigenous communities mapped the coast long before the survey."),

  w("chamber", "ephemeral", "ɪˈfemərəl", "adj.", "转瞬即逝的", "Fame of that kind is ephemeral."),
  w("chamber", "paradox", "ˈpærədɑːks", "n.", "悖论", "The result is a paradox: more choice, less satisfaction."),
  w("chamber", "resilient", "rɪˈzɪliənt", "adj.", "有韧性的", "Resilient cities recover faster after a storm."),
  w("chamber", "volatile", "ˈvɑːlətl", "adj.", "易变的；不稳定的", "Oil prices were volatile throughout the year."),
  w("chamber", "elusive", "iˈluːsɪv", "adj.", "难以捉摸的", "A lasting cure remains elusive."),
  w("chamber", "tangible", "ˈtændʒəbl", "adj.", "切实的；可触摸的", "The policy brought tangible benefits to the clinic."),
  w("chamber", "abstract", "ˈæbstrækt", "adj.", "抽象的", "Abstract terms can hide a simple disagreement."),
  w("chamber", "intricate", "ˈɪntrɪkət", "adj.", "错综复杂的", "The mechanism is intricate and easy to misstate."),
  w("chamber", "subtle", "ˈsʌtl", "adj.", "微妙的", "The difference in tone is subtle but important."),
  w("chamber", "tentative", "ˈtentətɪv", "adj.", "试探性的；暂定的", "The findings stay tentative until the sample grows."),
  w("chamber", "sporadic", "spəˈrædɪk", "adj.", "零星的", "Protests were sporadic and hard to predict."),
  w("chamber", "inevitable", "ɪnˈevɪtəbl", "adj.", "不可避免的", "Some conflict was inevitable once the budget was cut."),
]

const seen = new Set<string>()
for (const word of WORDS) {
  if (seen.has(word.id)) throw new Error(`duplicate word id ${word.id}`)
  seen.add(word.id)
  if (!ROOMS.some((room) => room.id === word.roomId)) {
    throw new Error(`unknown room ${word.roomId} for ${word.id}`)
  }
}

export function wordsInRoom(roomId: string): Word[] {
  return WORDS.filter((word) => word.roomId === roomId)
}
