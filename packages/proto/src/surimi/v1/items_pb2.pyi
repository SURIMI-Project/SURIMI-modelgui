from surimi.v1 import climate_scenario_pb2 as _climate_scenario_pb2
from surimi.v1 import currency_pb2 as _currency_pb2
from surimi.v1 import fleet_segment_pb2 as _fleet_segment_pb2
from surimi.v1 import market_pb2 as _market_pb2
from surimi.v1 import price_category_pb2 as _price_category_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Items(_message.Message):
    __slots__ = ("markets", "currencies", "species", "fleet_segments", "price_categories", "climate_scenarios")
    MARKETS_FIELD_NUMBER: _ClassVar[int]
    CURRENCIES_FIELD_NUMBER: _ClassVar[int]
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    FLEET_SEGMENTS_FIELD_NUMBER: _ClassVar[int]
    PRICE_CATEGORIES_FIELD_NUMBER: _ClassVar[int]
    CLIMATE_SCENARIOS_FIELD_NUMBER: _ClassVar[int]
    markets: _containers.RepeatedCompositeFieldContainer[_market_pb2.Market]
    currencies: _containers.RepeatedCompositeFieldContainer[_currency_pb2.Currency]
    species: _containers.RepeatedCompositeFieldContainer[_species_pb2.Species]
    fleet_segments: _containers.RepeatedCompositeFieldContainer[_fleet_segment_pb2.FleetSegment]
    price_categories: _containers.RepeatedCompositeFieldContainer[_price_category_pb2.PriceCategory]
    climate_scenarios: _containers.RepeatedCompositeFieldContainer[_climate_scenario_pb2.ClimateScenario]
    def __init__(self, markets: _Optional[_Iterable[_Union[_market_pb2.Market, _Mapping]]] = ..., currencies: _Optional[_Iterable[_Union[_currency_pb2.Currency, _Mapping]]] = ..., species: _Optional[_Iterable[_Union[_species_pb2.Species, _Mapping]]] = ..., fleet_segments: _Optional[_Iterable[_Union[_fleet_segment_pb2.FleetSegment, _Mapping]]] = ..., price_categories: _Optional[_Iterable[_Union[_price_category_pb2.PriceCategory, _Mapping]]] = ..., climate_scenarios: _Optional[_Iterable[_Union[_climate_scenario_pb2.ClimateScenario, _Mapping]]] = ...) -> None: ...
