/** @calc-zone exports */
import { agentCatalogSheet, loopPairsSheet } from './sheets/agentsLoops';
import { regArtifacts, sdlcArtifacts } from './sheets/artefacts';
import { dependencies, sCurve } from './sheets/deps';
import { dynamicCards, dynamicRows, dynamicSections } from './sheets/dynamic';
import { factoryMeta } from './sheets/fm';
import { groups, sections } from './sheets/groups';
import { menuStructures } from './sheets/menuStructures';
import { skillMap, statusLifecycle, tobeSplit, tobeTeam } from './sheets/lifecycleSheets';
import { parameters } from './sheets/parameters';
import { personaSectionOrder, personaSequence } from './sheets/personaOrder';
import { personaSections, personas } from './sheets/personas';
import { inputTeam, rateCard } from './sheets/rateTeam';
import { locationTarget, phaseScope, qualityAsIs } from './sheets/scopeSheets';
import { strategies } from './sheets/strategies';
import { regNorms, regSettings, tokenModels } from './sheets/tokensReg';
import { PORTFOLIO_SHEETS } from '../portfolio/names';
import type { SheetFamily } from './types';

/** Sheet order of the workbook (legacy exportParams). */
export const WRITE_ORDER: SheetFamily[] = [parameters, rateCard, inputTeam, phaseScope, locationTarget, qualityAsIs, tokenModels, regSettings, regNorms, regArtifacts, sdlcArtifacts,
  agentCatalogSheet, loopPairsSheet, personas, personaSections, groups, sections, menuStructures, dependencies, sCurve, personaSectionOrder, personaSequence, dynamicSections, dynamicCards, dynamicRows,
  statusLifecycle, tobeTeam, skillMap, tobeSplit, strategies, factoryMeta];

/** Order in which sheets are applied on import (legacy importParams): later sheets validate against what earlier ones set. */
export const READ_ORDER: SheetFamily[] = [parameters, rateCard, inputTeam, phaseScope, locationTarget, qualityAsIs, tokenModels, regSettings, regNorms, regArtifacts, agentCatalogSheet, loopPairsSheet,
  sdlcArtifacts, personas, personaSections, personaSectionOrder, personaSequence, groups, sections, menuStructures, dependencies, sCurve, dynamicSections, dynamicCards, dynamicRows, factoryMeta,
  statusLifecycle, skillMap, tobeSplit, strategies];

/** The sheets the loader keeps: the 47 case sheets plus the portfolio sheets (read by `portfolio/`, ignored by the case import). */
export const KNOWN_SHEETS: Set<string> = new Set([...WRITE_ORDER.flatMap((f) => f.sheets), ...PORTFOLIO_SHEETS]);
/** Sheets kept by the "persona config only" export. */
export const PERSONA_SHEETS = new Set(['Personas', 'Persona Sections', 'Persona Section Order', 'Persona Sequence', 'Groups', 'Sections', 'Menu Structures', 'Menu Structure Sections', 'Dependencies']);
