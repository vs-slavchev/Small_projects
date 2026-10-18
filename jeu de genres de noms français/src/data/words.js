// Banque de mots brute : groupes (terminaisons) et mots.
// Deux exemples réguliers par groupe, plus une exception quand elle existe.
// Mot : w (texte), g ('m' | 'f'), grp (id du groupe), exc (exception), asp (h aspiré : pas d'élision),
//       en (traduction), fun (anecdote facultative).
// Les mots commençant par une voyelle ou un h muet prennent l'article élidé « l’ ».
// Ce fichier ne contient que des données ; WordBank.fromData() les valide et les transforme en objets du domaine.

export const GROUPS = Object.freeze([
  // Féminins
  { id: 'ette', label: '-ette', g: 'f', rule: "Les noms en <b>-ette</b> sont presque toujours féminins : c'est un suffixe diminutif féminin." },
  { id: 'tion', label: '-tion', g: 'f', rule: "Les noms en <b>-tion</b> sont féminins : ils viennent des noms latins en <i>-tio</i>." },
  { id: 'te', label: '-té', g: 'f', rule: "Les noms en <b>-té</b> qui désignent une qualité ou un état sont féminins." },
  { id: 'ure', label: '-ure', g: 'f', rule: "Les noms en <b>-ure</b> sont généralement féminins." },
  { id: 'ance', label: '-ance', g: 'f', rule: "Les noms en <b>-ance</b> sont féminins : le suffixe désigne une action ou un état." },
  { id: 'ence', label: '-ence', g: 'f', rule: "Les noms en <b>-ence</b> sont féminins, à une exception près, très courante." },
  { id: 'ade', label: '-ade', g: 'f', rule: "Les noms en <b>-ade</b> sont généralement féminins : le suffixe désigne une action ou son résultat." },
  { id: 'ee', label: '-ée', g: 'f', rule: "Les noms en <b>-ée</b> sont généralement féminins, comme un participe passé au féminin." },
  { id: 'ie', label: '-ie', g: 'f', rule: "Les noms en <b>-ie</b> sont presque tous féminins." },
  { id: 'elle', label: '-elle', g: 'f', rule: "Les noms en <b>-elle</b> sont féminins." },
  { id: 'esse', label: '-esse', g: 'f', rule: "Les noms en <b>-esse</b> sont féminins : le suffixe transforme un adjectif en nom de qualité." },
  { id: 'ise', label: '-ise', g: 'f', rule: "Les noms en <b>-ise</b> sont généralement féminins." },
  { id: 'oire', label: '-oire', g: 'f', rule: "Les noms en <b>-oire</b> sont généralement féminins." },
  // Masculins
  { id: 'age', label: '-age', g: 'm', rule: "Les noms en <b>-age</b> sont masculins quand <b>-age</b> est un suffixe ajouté à un verbe ou à un nom." },
  { id: 'ment', label: '-ment', g: 'm', rule: "Les noms en <b>-ment</b> sont masculins : le suffixe forme des noms d'action à partir de verbes." },
  { id: 'eau', label: '-eau', g: 'm', rule: "Les noms en <b>-eau</b> sont presque toujours masculins." },
  { id: 'isme', label: '-isme', g: 'm', rule: "Les noms en <b>-isme</b> sont toujours masculins." },
  { id: 'ier', label: '-ier', g: 'm', rule: "Les noms en <b>-ier</b> sont masculins : souvent un objet, un arbre ou un métier." },
  { id: 'et', label: '-et', g: 'm', rule: "Les noms en <b>-et</b> sont masculins : c'est le diminutif masculin, le pendant de <b>-ette</b>." },
  { id: 'on', label: '-on', g: 'm', rule: "Les noms en <b>-on</b> (hors <b>-tion</b>) sont généralement masculins." },
  { id: 'in', label: '-in', g: 'm', rule: "Les noms en <b>-in</b> sont généralement masculins." },
  { id: 'eme', label: '-ème', g: 'm', rule: "Les noms en <b>-ème</b> sont généralement masculins : beaucoup viennent de mots grecs neutres en <i>-ema</i>." },
  { id: 'at', label: '-at', g: 'm', rule: "Les noms en <b>-at</b> sont masculins." },
  { id: 'oir', label: '-oir', g: 'm', rule: "Les noms en <b>-oir</b> sont masculins : souvent un objet ou un lieu lié à une action." },
  { id: 'ail', label: '-ail', g: 'm', rule: "Les noms en <b>-ail</b> sont masculins." },
]);

export const WORDS = Object.freeze([
  // -ette
  { w: 'baguette', g: 'f', grp: 'ette', en: 'baguette', fun: "« Baguette » vient de l'italien <i>bacchetta</i>, « petit bâton ». Le pain n'a pris ce nom qu'au début du XXᵉ siècle." },
  { w: 'chaussette', g: 'f', grp: 'ette', en: 'sock', fun: "Diminutif de « chausse », le vêtement qui couvrait les jambes au Moyen Âge." },
  { w: 'squelette', g: 'm', grp: 'ette', exc: true, en: 'skeleton', fun: "Il vient du grec <i>skeletós</i>, « desséché ». Le « -ette » n'a rien d'un diminutif ici : c'est une coïncidence d'orthographe." },
  { w: 'assiette', g: 'f', grp: 'ette', en: 'plate', fun: "Au départ, l’« assiette » désignait la place où l’on était assis à table, puis le plat qu’on y servait." },
  // -tion
  { w: 'nation', g: 'f', grp: 'tion', en: 'nation', fun: "Du latin <i>natio</i>, de <i>nasci</i>, « naître » : à l'origine, un groupe de personnes nées au même endroit." },
  { w: 'potion', g: 'f', grp: 'tion', en: 'potion', fun: "Même origine que « poison » : les deux viennent du latin <i>potio</i>, « boisson »." },
  { w: 'émotion', g: 'f', grp: 'tion', en: 'emotion', fun: "Du latin <i>emovere</i>, « mettre en mouvement » : une émotion, c’est ce qui nous remue." },
  // -té
  { w: 'liberté', g: 'f', grp: 'te', en: 'freedom', fun: "Du latin <i>libertas</i>. Elle ouvre la devise « Liberté, Égalité, Fraternité », inscrite dans la Constitution de 1848." },
  { w: 'beauté', g: 'f', grp: 'te', en: 'beauty', fun: "Construit sur « beau » + <b>-té</b>, comme « bonté » sur « bon »." },
  { w: 'côté', g: 'm', grp: 'te', exc: true, en: 'side', fun: "Ce n'est pas une qualité : il vient du latin <i>costa</i>, « côte », comme les côtes du corps." },
  { w: 'unité', g: 'f', grp: 'te', en: 'unit', fun: "Du latin <i>unitas</i>, de <i>unus</i>, « un »." },
  // -ure
  { w: 'voiture', g: 'f', grp: 'ure', en: 'car', fun: "Du latin <i>vectura</i>, « transport ». Avant l'automobile, une voiture était tirée par des chevaux." },
  { w: 'culture', g: 'f', grp: 'ure', en: 'culture', fun: "Au départ, la culture, c'était le travail de la terre ; le sens « savoir » est venu bien plus tard." },
  { w: 'murmure', g: 'm', grp: 'ure', exc: true, en: 'murmur', fun: "C'est une onomatopée : le latin <i>murmur</i> imite le bruit sourd d'un ruisseau ou d'une foule." },
  { w: 'aventure', g: 'f', grp: 'ure', en: 'adventure', fun: "Du latin <i>adventura</i>, « ce qui doit arriver »." },
  // -ance
  { w: 'chance', g: 'f', grp: 'ance', en: 'luck', fun: "Du latin <i>cadentia</i>, « la façon dont tombent les dés »." },
  { w: 'confiance', g: 'f', grp: 'ance', en: 'trust', fun: "De « confier », du latin <i>confidere</i> : se fier entièrement à quelqu'un." },
  { w: 'ambulance', g: 'f', grp: 'ance', en: 'ambulance', fun: "À l’origine, un « hôpital ambulant » qui suivait les armées en campagne." },
  // -ence
  { w: 'patience', g: 'f', grp: 'ence', en: 'patience', fun: "Du latin <i>pati</i>, « souffrir » : la même racine que le « patient » à l'hôpital." },
  { w: 'science', g: 'f', grp: 'ence', en: 'science', fun: "Du latin <i>scientia</i>, « connaissance », de <i>scire</i>, « savoir »." },
  { w: 'silence', g: 'm', grp: 'ence', exc: true, en: 'silence', fun: "La seule exception vraiment courante du groupe. Pour la retenir : « le silence est d'or »." },
  { w: 'essence', g: 'f', grp: 'ence', en: 'petrol', fun: "Du latin <i>essentia</i>, « nature profonde d’une chose » : l’essence d’une plante, puis le carburant." },
  // -ade
  { w: 'salade', g: 'f', grp: 'ade', en: 'salad', fun: "De l'italien <i>insalata</i>, « salée » : les légumes étaient assaisonnés de sel." },
  { w: 'promenade', g: 'f', grp: 'ade', en: 'walk', fun: "Construit sur « promener » ; le suffixe <b>-ade</b> désigne une action, comme dans « baignade »." },
  { w: 'stade', g: 'm', grp: 'ade', exc: true, en: 'stadium', fun: "Du grec <i>stadion</i>, une unité de longueur d'environ 190 m : la longueur de la piste d'Olympie. Ici, « -ade » n'est pas un suffixe." },
  { w: 'ambassade', g: 'f', grp: 'ade', en: 'embassy', fun: "De l’italien <i>ambasciata</i>, « mission confiée à un envoyé »." },
  // -ée
  { w: 'journée', g: 'f', grp: 'ee', en: 'day', fun: "Dérivé de « jour » : la journée insiste sur la durée, sur ce qu'on y vit." },
  { w: 'purée', g: 'f', grp: 'ee', en: 'mash', fun: "Du vieux verbe « purer », « purifier, filtrer » : on passait les légumes pour les rendre lisses." },
  { w: 'musée', g: 'm', grp: 'ee', exc: true, en: 'museum', fun: "Du grec <i>mouseion</i>, le temple des Muses. Le « -ée » vient du grec, pas du suffixe féminin." },
  { w: 'idée', g: 'f', grp: 'ee', en: 'idea', fun: "Du grec <i>idea</i>, « forme, apparence »." },
  // -ie
  { w: 'boulangerie', g: 'f', grp: 'ie', en: 'bakery', fun: "Le boulanger viendrait du picard <i>boulenc</i>, celui qui façonne des pains ronds, en boule." },
  { w: 'magie', g: 'f', grp: 'ie', en: 'magic', fun: "Elle doit son nom aux mages, les prêtres savants de l'ancienne Perse." },
  { w: 'parapluie', g: 'm', grp: 'ie', exc: true, en: 'umbrella', fun: "Un mot composé de « parer » + « pluie » : c'est l'objet qui pare la pluie. Les composés verbe + nom sont masculins." },
  { w: 'harmonie', g: 'f', grp: 'ie', en: 'harmony', fun: "Du grec <i>harmonia</i>, « assemblage, ajustement ». Le h est muet : on dit « l’harmonie »." },
  // -elle
  { w: 'poubelle', g: 'f', grp: 'elle', en: 'bin', fun: "Elle doit son nom au préfet Eugène Poubelle, qui l'imposa aux Parisiens en 1884." },
  { w: 'vaisselle', g: 'f', grp: 'elle', en: 'dishes', fun: "Du latin <i>vascella</i>, « petits vases »." },
  { w: 'violoncelle', g: 'm', grp: 'elle', exc: true, en: 'cello', fun: "De l'italien <i>violoncello</i>, « petit violone ». En italien, le mot est masculin, et le français l'a gardé ainsi." },
  { w: 'échelle', g: 'f', grp: 'elle', en: 'ladder', fun: "Du latin <i>scala</i>. Le « é » initial s’est ajouté pour faciliter la prononciation, comme dans « école »." },
  // -esse
  { w: 'jeunesse', g: 'f', grp: 'esse', en: 'youth', fun: "Le suffixe <b>-esse</b> transforme un adjectif en nom : jeune → jeunesse, sage → sagesse." },
  { w: 'politesse', g: 'f', grp: 'esse', en: 'politeness', fun: "De l'italien <i>pulitezza</i>, « propreté, netteté » : être poli, c'était d'abord être « poli » comme une pierre lisse." },
  { w: 'adresse', g: 'f', grp: 'esse', en: 'address', fun: "Du verbe « adresser », « diriger vers » : l’adresse indique où diriger une lettre." },
  // -ise
  { w: 'valise', g: 'f', grp: 'ise', en: 'suitcase', fun: "De l'italien <i>valigia</i>, arrivé en français au XVIᵉ siècle." },
  { w: 'cerise', g: 'f', grp: 'ise', en: 'cherry', fun: "Du latin populaire <i>ceresia</i> ; le fruit tirerait son nom de Cérasonte, une ville au bord de la mer Noire." },
  { w: 'pare-brise', g: 'm', grp: 'ise', exc: true, en: 'windscreen', fun: "Comme « parapluie », c'est un composé verbe + nom (« parer » la « brise ») : ces mots-là sont masculins." },
  { w: 'église', g: 'f', grp: 'ise', en: 'church', fun: "Du grec <i>ekklêsia</i>, « assemblée »." },
  // -oire
  { w: 'victoire', g: 'f', grp: 'oire', en: 'victory', fun: "Du latin <i>victoria</i>, qui était aussi le nom de la déesse de la victoire chez les Romains." },
  { w: 'gloire', g: 'f', grp: 'oire', en: 'glory', fun: "Du latin <i>gloria</i>, « renommée »." },
  { w: 'pourboire', g: 'm', grp: 'oire', exc: true, en: 'tip', fun: "Littéralement « pour boire » : l'argent donné pour aller boire un verre. Un mot composé, donc masculin." },
  { w: 'histoire', g: 'f', grp: 'oire', en: 'history, story', fun: "Du grec <i>historia</i>, « enquête » : l’historien était d’abord un enquêteur." },
  // -age
  { w: 'fromage', g: 'm', grp: 'age', en: 'cheese', fun: "Du latin <i>formaticus</i>, « fait dans une forme » : le fromage était moulé. L'italien a gardé <i>formaggio</i>." },
  { w: 'voyage', g: 'm', grp: 'age', en: 'journey', fun: "Du latin <i>viaticum</i>, les provisions pour la route : le voyage, c'était d'abord ce qu'on emportait." },
  { w: 'plage', g: 'f', grp: 'age', exc: true, en: 'beach', fun: "Ici, « -age » n'est pas un suffixe : le mot vient du grec <i>plagios</i>, « oblique ». Même piège pour page, cage, image, rage et nage." },
  { w: 'orage', g: 'm', grp: 'age', en: 'storm', fun: "Dérivé de l’ancien « ore », « vent », du latin <i>aura</i>, « souffle »." },
  // -ment
  { w: 'moment', g: 'm', grp: 'ment', en: 'moment', fun: "Du latin <i>momentum</i>, « mouvement » : à l'origine, le petit poids qui fait pencher la balance." },
  { w: 'monument', g: 'm', grp: 'ment', en: 'monument', fun: "Du latin <i>monere</i>, « faire se souvenir » : un monument est fait pour qu'on se rappelle." },
  { w: 'jument', g: 'f', grp: 'ment', exc: true, en: 'mare', fun: "C'est une femelle, donc féminin. Pourtant le latin <i>jumentum</i> désignait une bête de somme, mâle ou femelle." },
  { w: 'appartement', g: 'm', grp: 'ment', en: 'flat', fun: "De l’italien <i>appartamento</i>, la partie d’une maison réservée à quelqu’un." },
  // -eau
  { w: 'bateau', g: 'm', grp: 'eau', en: 'boat', fun: "Viendrait du vieil anglais <i>bat</i>, « embarcation » : l'anglais <i>boat</i> a la même origine." },
  { w: 'chapeau', g: 'm', grp: 'eau', en: 'hat', fun: "De « chape », une grande cape à capuchon : le chapeau était d'abord une petite chape." },
  { w: 'peau', g: 'f', grp: 'eau', exc: true, en: 'skin', fun: "Elle vient du latin <i>pellis</i>, un mot féminin, qu'on retrouve dans « pellicule »." },
  { w: 'oiseau', g: 'm', grp: 'eau', en: 'bird', fun: "Du latin populaire <i>aucellus</i>, « petit oiseau »." },
  // -isme
  { w: 'tourisme', g: 'm', grp: 'isme', en: 'tourism', fun: "Vient de l'anglais <i>tourism</i>, tiré du « Grand Tour » d'Europe que faisaient les jeunes aristocrates." },
  { w: 'réalisme', g: 'm', grp: 'isme', en: 'realism', fun: "Le mot s'est imposé au XIXᵉ siècle avec des peintres comme Gustave Courbet." },
  { w: 'héroïsme', g: 'm', grp: 'isme', en: 'heroism', fun: "On dit « le héros » (h aspiré) mais « l’héroïsme » et « l’héroïne » : ici, le h est muet." },
  // -ier
  { w: 'cahier', g: 'm', grp: 'ier', en: 'notebook', fun: "Du latin <i>quaterni</i>, « par quatre » : un cahier était un assemblage de feuilles pliées en quatre." },
  { w: 'panier', g: 'm', grp: 'ier', en: 'basket', fun: "Du latin <i>panarium</i>, « corbeille à pain »." },
  { w: 'escalier', g: 'm', grp: 'ier', en: 'staircase', fun: "Du latin <i>scalaria</i>, de <i>scala</i>, « échelle »." },
  // -et
  { w: 'jouet', g: 'm', grp: 'et', en: 'toy' },
  { w: 'billet', g: 'm', grp: 'et', en: 'ticket', fun: "De l'ancien « bullette », un petit document scellé : la « bulle » était le sceau." },
  { w: 'objet', g: 'm', grp: 'et', en: 'object', fun: "Du latin <i>objectum</i>, « ce qui est placé devant »." },
  // -on
  { w: 'citron', g: 'm', grp: 'on', en: 'lemon', fun: "Du latin <i>citrus</i>. Le fruit, venu d'Asie, a gagné la Méditerranée pendant l'Antiquité." },
  { w: 'bouton', g: 'm', grp: 'on', en: 'button', fun: "De « bouter », « pousser » : d'abord le bourgeon qui pousse sur la plante, puis le petit objet rond qui lui ressemble." },
  { w: 'maison', g: 'f', grp: 'on', exc: true, en: 'house', fun: "Du latin <i>mansio</i>, « séjour » (de <i>manere</i>, « rester »), un mot féminin. Même famille que « manoir »." },
  { w: 'hérisson', g: 'm', grp: 'on', asp: true, en: 'hedgehog', fun: "Le h est aspiré : on dit « le hérisson », sans élision. Du latin <i>ericius</i>." },
  { w: 'horizon', g: 'm', grp: 'on', en: 'horizon', fun: "Du grec <i>horizôn</i>, « qui délimite ». Le h est muet : on dit « l’horizon »." },
  // -in
  { w: 'jardin', g: 'm', grp: 'in', en: 'garden', fun: "D'origine francique : <i>gart</i>, « clôture ». Le jardin était d'abord un enclos." },
  { w: 'matin', g: 'm', grp: 'in', en: 'morning', fun: "Du latin <i>matutinum</i>. Matuta était la déesse romaine de l'aurore." },
  { w: 'main', g: 'f', grp: 'in', exc: true, en: 'hand', fun: "Du latin <i>manus</i>, déjà féminin. On le retrouve dans « manuel », « manier » et « manucure »." },
  { w: 'engin', g: 'm', grp: 'in', en: 'machine', fun: "Du latin <i>ingenium</i>, « talent, invention » : un engin était d’abord une machine ingénieuse." },
  // -ème
  { w: 'problème', g: 'm', grp: 'eme', en: 'problem', fun: "Du grec <i>problêma</i>, « ce qu'on jette devant soi » : un obstacle." },
  { w: 'système', g: 'm', grp: 'eme', en: 'system', fun: "Du grec <i>systêma</i>, « assemblage ». Comme thème et poème, ce mot grec en <i>-ema</i> est masculin." },
  { w: 'crème', g: 'f', grp: 'eme', exc: true, en: 'cream', fun: "Rien de grec ici : le mot viendrait du gaulois <i>crama</i>, mêlé au latin <i>chrisma</i>, l'huile sacrée." },
  { w: 'emblème', g: 'm', grp: 'eme', en: 'emblem', fun: "Du grec <i>emblêma</i>, « ornement incrusté »." },
  // -at
  { w: 'chocolat', g: 'm', grp: 'at', en: 'chocolate', fun: "Du nahuatl <i>xocolatl</i>, une boisson amère des Aztèques." },
  { w: 'résultat', g: 'm', grp: 'at', en: 'result', fun: "Du latin <i>resultare</i>, « rebondir » : le résultat, c'est ce qui rebondit d'une action." },
  { w: 'avocat', g: 'm', grp: 'at', en: 'lawyer', fun: "Du latin <i>advocatus</i>, « celui qu’on appelle à l’aide »." },
  // -oir
  { w: 'miroir', g: 'm', grp: 'oir', en: 'mirror', fun: "De « mirer », « regarder », du latin <i>mirari</i>, « s'étonner », comme dans « miracle »." },
  { w: 'couloir', g: 'm', grp: 'oir', en: 'corridor', fun: "Dérivé de « couler » : un passage étroit où l'on s'écoule d'une pièce à l'autre." },
  { w: 'espoir', g: 'm', grp: 'oir', en: 'hope', fun: "Dérivé du verbe « espérer »." },
  // -ail
  { w: 'travail', g: 'm', grp: 'ail', en: 'work', fun: "Selon l'explication la plus répandue, il viendrait du latin <i>tripalium</i>, un instrument à trois pieux." },
  { w: 'portail', g: 'm', grp: 'ail', en: 'gate', fun: "Dérivé de « porte » : une grande porte, souvent celle d'une église." },
  { w: 'éventail', g: 'm', grp: 'ail', en: 'fan', fun: "Dérivé de « éventer », « donner de l’air »." },
]);

export const WORD_DATA = Object.freeze({ groups: GROUPS, words: WORDS });
