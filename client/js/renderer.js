
define(['camera', 'item', 'character', 'player', 'timer'],
function(Camera, Item, Character, Player, Timer) {

    var Renderer = Class.extend({
        init: function(game, canvas, background, foreground) {
            this.game = game;
            this.context = (canvas && canvas.getContext) ? canvas.getContext("2d") : null;
            this.background = (background && background.getContext) ? background.getContext("2d") : null;
            this.foreground = (foreground && foreground.getContext) ? foreground.getContext("2d") : null;

            this.canvas = canvas;
            this.backcanvas = background;
            this.forecanvas = foreground;

            this.initFPS();
            this.tilesize = 16;

            this.upscaledRendering = this.context.mozImageSmoothingEnabled !== undefined;
            this.supportsSilhouettes = this.upscaledRendering;

            this.rescale(this.getScaleFactor());

            this.lastTime = new Date();
            this.frameCount = 0;
            this.maxFPS = this.FPS;
            this.realFPS = 0;
            //Turn on or off Debuginfo (FPS Counter)
            this.isDebugInfoVisible = false;

            this.animatedTileCount = 0;
            this.highTileCount = 0;

            this.tablet = Detect.isTablet(window.innerWidth);

            this.fixFlickeringTimer = new Timer(100);
        },

        getWidth: function() {
            return this.canvas.width;
        },

        getHeight: function() {
            return this.canvas.height;
        },

        setTileset: function(tileset) {
            this.tileset = tileset;
        },

        getScaleFactor: function() {
            var w = window.innerWidth,
                h = window.innerHeight,
                scale;

            this.mobile = false;

            if(w <= 1000) {
                scale = 2;
                this.mobile = true;
            }
            else if(w <= 1500 || h <= 870) {
                scale = 2;
            }
            else {
                scale = 3;
            }

            return scale;
        },

        rescale: function(factor) {
            this.scale = this.getScaleFactor();

            this.createCamera();

            this.context.mozImageSmoothingEnabled = false;
            this.background.mozImageSmoothingEnabled = false;
            this.foreground.mozImageSmoothingEnabled = false;

            this.initFont();
            this.initFPS();

            if(!this.upscaledRendering && this.game.map && this.game.map.tilesets) {
                this.setTileset(this.game.map.tilesets[this.scale - 1]);
            }
            if(this.game.renderer) {
                this.game.setSpriteScale(this.scale);
            }
        },

        createCamera: function() {
            this.camera = new Camera(this);
            this.camera.rescale();

            this.canvas.width = this.camera.gridW * this.tilesize * this.scale;
            this.canvas.height = this.camera.gridH * this.tilesize * this.scale;
            console.log("#entities set to "+this.canvas.width+" x "+this.canvas.height);

            this.backcanvas.width = this.canvas.width;
            this.backcanvas.height = this.canvas.height;
            console.log("#background set to "+this.backcanvas.width+" x "+this.backcanvas.height);

            this.forecanvas.width = this.canvas.width;
            this.forecanvas.height = this.canvas.height;
            console.log("#foreground set to "+this.forecanvas.width+" x "+this.forecanvas.height);
        },

        initFPS: function() {
            this.FPS = this.mobile ? 50 : 50;
        },

        initFont: function() {
            var fontsize;

            switch(this.scale) {
                case 1:
                    fontsize = 10; break;
                case 2:
                    fontsize = Detect.isWindows() ? 10 : 13; break;
                case 3:
                    fontsize = 20;
            }
            this.setFontSize(fontsize);
        },

        setFontSize: function(size) {
            var font = size+"px GraphicPixel";

            this.context.font = font;
            this.background.font = font;
        },

        drawText: function(text, x, y, centered, color, strokeColor) {
            var ctx = this.context,
                strokeSize;

            switch(this.scale) {
                case 1:
                    strokeSize = 3; break;
                case 2:
                    strokeSize = 3; break;
                case 3:
                    strokeSize = 5;
            }

            if(text && x && y) {
                ctx.save();
                if(centered) {
                    ctx.textAlign = "center";
                }
                ctx.strokeStyle = strokeColor || "#373737";
                ctx.lineWidth = strokeSize;
                ctx.strokeText(text, x, y);
                ctx.fillStyle = color || "white";
                ctx.fillText(text, x, y);
                ctx.restore();
            }
        },

        drawCellRect: function(x, y, color) {
            this.context.save();
            this.context.lineWidth = 2*this.scale;
            this.context.strokeStyle = color;
            this.context.translate(x+2, y+2);
            this.context.strokeRect(0, 0, (this.tilesize * this.scale) - 4, (this.tilesize * this.scale) - 4);
            this.context.restore();
        },
        drawRectStroke: function(x, y, width, height, color) {
            this.context.fillStyle = color;
            this.context.fillRect(x, y, (this.tilesize * this.scale)*width, (this.tilesize * this.scale)*height);
            this.context.fill();
            this.context.lineWidth = 5;
            this.context.strokeStyle = 'black';
            this.context.strokeRect(x, y, (this.tilesize * this.scale)*width, (this.tilesize * this.scale)*height);
        },
        drawRect: function(x, y, width, height, color) {
            this.context.fillStyle = color;
            this.context.fillRect(x, y, (this.tilesize * this.scale)*width, (this.tilesize * this.scale)*height);
        },

        drawCellHighlight: function(x, y, color) {
            var s = this.scale,
                ts = this.tilesize,
                tx = x * ts * s,
                ty = y * ts * s;

            this.drawCellRect(tx, ty, color);
        },

        drawTargetCell: function() {
            var mouse = this.game.getMouseGridPosition();

            if(this.game.targetCellVisible && !(mouse.x === this.game.selectedX && mouse.y === this.game.selectedY)) {
                this.drawCellHighlight(mouse.x, mouse.y, this.game.targetColor);
            }
        },

        drawAttackTargetCell: function() {
            var mouse = this.game.getMouseGridPosition(),
                entity = this.game.getEntityAt(mouse.x, mouse.y),
                s = this.scale;

            if(entity) {
                this.drawCellRect(entity.x * s, entity.y * s, "rgba(255, 0, 0, 0.5)");
            }
        },

        drawOccupiedCells: function() {
            var positions = this.game.entityGrid;

            if(positions) {
                for(var i=0; i < positions.length; i += 1) {
                    for(var j=0; j < positions[i].length; j += 1) {
                        if(!_.isNull(positions[i][j])) {
                            this.drawCellHighlight(i, j, "rgba(50, 50, 255, 0.5)");
                        }
                    }
                }
            }
        },

        drawPathingCells: function() {
            var grid = this.game.pathingGrid;

            if(grid && this.game.debugPathing) {
                for(var y=0; y < grid.length; y += 1) {
                    for(var x=0; x < grid[y].length; x += 1) {
                        if(grid[y][x] === 1 && this.game.camera.isVisiblePosition(x, y)) {
                            this.drawCellHighlight(x, y, "rgba(50, 50, 255, 0.5)");
                        }
                    }
                }
            }
        },

        drawSelectedCell: function() {
                var sprite = this.game.cursors["target"],
                anim = this.game.targetAnimation,
                os = this.upscaledRendering ? 1 : this.scale,
                ds = this.upscaledRendering ? this.scale : 1;

            if(this.game.selectedCellVisible) {
                if(this.mobile || this.tablet) {
                    if(this.game.drawTarget) {
                        var x = this.game.selectedX,
                            y = this.game.selectedY;

                        this.drawCellHighlight(this.game.selectedX, this.game.selectedY, "rgb(51, 255, 0)");
                        this.lastTargetPos = { x: x,
                                               y: y };
                        this.game.drawTarget = false;
                    }
                } else {
                    if(sprite && anim) {
                        var    frame = anim.currentFrame,
                            s = this.scale,
                            x = frame.x * os,
                            y = frame.y * os,
                            w = sprite.width * os,
                            h = sprite.height * os,
                            ts = 16,
                            dx = this.game.selectedX * ts * s,
                            dy = this.game.selectedY * ts * s,
                            dw = w * ds,
                            dh = h * ds;

                        this.context.save();
                        this.context.translate(dx, dy);
                        this.context.drawImage(sprite.image, x, y, w, h, 0, 0, dw, dh);
                        this.context.restore();
                    }
                }
            }
        },

        clearScaledRect: function(ctx, x, y, w, h) {
            var s = this.scale;

            ctx.clearRect(x * s, y * s, w * s, h * s);
        },

        drawCursor: function() {
            var mx = this.game.mouse.x,
                my = this.game.mouse.y,
                s = this.scale,
                os = this.upscaledRendering ? 1 : this.scale;

            this.context.save();
            if(this.game.currentCursor && this.game.currentCursor.isLoaded) {
                this.context.drawImage(this.game.currentCursor.image, 0, 0, 14 * os, 14 * os, mx, my, 14*s, 14*s);
            }
            this.context.restore();
        },

        drawScaledImage: function(ctx, image, x, y, w, h, dx, dy) {
            var s = this.upscaledRendering ? 1 : this.scale;
            _.each(arguments, function(arg) {
                if(_.isUndefined(arg) || _.isNaN(arg) || _.isNull(arg) || arg < 0) {
                    log.error("x:"+x+" y:"+y+" w:"+w+" h:"+h+" dx:"+dx+" dy:"+dy, true);
                    throw Error("A problem occured when trying to draw on the canvas");
                }
            });

            ctx.drawImage(image,
                          x * s,
                          y * s,
                          w * s,
                          h * s,
                          dx * this.scale,
                          dy * this.scale,
                          w * this.scale,
                          h * this.scale);
        },

        drawTile: function(ctx, tileid, tileset, setW, gridW, cellid) {
            var s = this.upscaledRendering ? 1 : this.scale;
            if(tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
                this.drawScaledImage(ctx,
                                     tileset,
                                     getX(tileid + 1, (setW / s)) * this.tilesize,
                                     Math.floor(tileid / (setW / s)) * this.tilesize,
                                     this.tilesize,
                                     this.tilesize,
                                     getX(cellid + 1, gridW) * this.tilesize,
                                     Math.floor(cellid / gridW) * this.tilesize);
            }
        },

        clearTile: function(ctx, gridW, cellid) {
            var s = this.scale,
                ts = this.tilesize,
                x = getX(cellid + 1, gridW) * ts * s,
                y = Math.floor(cellid / gridW) * ts * s,
                w = ts * s,
                h = w;

            ctx.clearRect(x, y, h, w);
        },

        drawEntity: function(entity) {
            var sprite = entity.sprite,
                shadow = this.game.shadows["small"],
                anim = entity.currentAnimation,
                os = this.upscaledRendering ? 1 : this.scale,
                ds = this.upscaledRendering ? this.scale : 1;

            if(anim && sprite) {
                var frame = anim.currentFrame,
                    s = this.scale,
                    x = frame.x * os,
                    y = frame.y * os,
                    w = sprite.width * os,
                    h = sprite.height * os,
                    ox = sprite.offsetX * s,
                    oy = sprite.offsetY * s,
                    dx = entity.x * s,
                    dy = entity.y * s,
                    dw = w * ds,
                    dh = h * ds;

                if(entity.isFading) {
                    this.context.save();
                    this.context.globalAlpha = entity.fadingAlpha;
                }

                if(!this.mobile && !this.tablet) {
                    this.drawEntityName(entity);
                }

                this.context.save();
                if(entity.flipSpriteX) {
                    this.context.translate(dx + this.tilesize*s, dy);
                    this.context.scale(-1, 1);
                }
                else if(entity.flipSpriteY) {
                    this.context.translate(dx, dy + dh);
                    this.context.scale(1, -1);
                }
                else {
                    this.context.translate(dx, dy);
                }

                if(entity.isVisible()) {
                    if(entity.hasShadow()) {
                        this.context.drawImage(shadow.image, 0, 0, shadow.width * os, shadow.height * os,
                                               0,
                                               entity.shadowOffsetY * ds,
                                               shadow.width * os * ds, shadow.height * os * ds);
                    }

                    if(entity.invincible){
                        var benef = this.game.sprites["firebenef"];
                        if(benef){
                            var benefAnimData = benef.animationData[anim.name];
                            if(benefAnimData){
                                var index = this.game.benefAnimation.currentFrame.index < benefAnimData.length ? this.game.benefAnimation.currentFrame.index : this.game.benefAnimation.currentFrame.index % benefAnimData.length,
                                    bx = benef.width * index * os,
                                    by = benef.height * benefAnimData.row * os,
                                    bw = benef.width * os,
                                    bh = benef.height * os;

                                this.context.drawImage(benef.image, bx, by, bw, bh,
                                                       benef.offsetX * s,
                                                       benef.offsetY * s,
                                                       bw * ds, bh * ds);
                            }
                        }
                    }

                    this.context.drawImage(sprite.image, x, y, w, h, ox, oy, dw, dh);

                    if(entity instanceof Item && entity.kind !== Types.Entities.CAKE) {
                        var sparks = this.game.sprites["sparks"],
                            anim = this.game.sparksAnimation,
                            frame = anim.currentFrame,
                            sx = sparks.width * frame.index * os,
                            sy = sparks.height * anim.row * os,
                            sw = sparks.width * os,
                            sh = sparks.width * os;

                        this.context.drawImage(sparks.image, sx, sy, sw, sh,
                                               sparks.offsetX * s,
                                               sparks.offsetY * s,
                                               sw * ds, sh * ds);
                    }
                }

                if(entity instanceof Character && !entity.isDead && entity.hasWeapon()) {
                    var weapon = this.game.sprites[entity.getWeaponName()];

                    if(weapon) {
                        var weaponAnimData = weapon.animationData[anim.name],
                            index = frame.index < weaponAnimData.length ? frame.index : frame.index % weaponAnimData.length,
                            wx = weapon.width * index * os,
                            wy = weapon.height * anim.row * os,
                            ww = weapon.width * os,
                            wh = weapon.height * os;

                        this.context.drawImage(weapon.image, wx, wy, ww, wh,
                                               weapon.offsetX * s,
                                               weapon.offsetY * s,
                                               ww * ds, wh * ds);
                    }
                }

                this.context.restore();

                if(entity instanceof Item) {
                    var item = entity;
                    if(item.count > 1) {
                        this.drawText(item.count,
                                      (entity.x + 8) * this.scale,
                                      (entity.y - 0.3) * this.scale,
                                      true,
                                      "white");
                    }
                }

                if(entity.isFading) {
                    this.context.restore();
                }
            }
        },

        drawEntities: function(dirtyOnly) {
            var self = this;

            this.game.forEachVisibleEntityByDepth(function(entity) {
                if(entity.isLoaded) {
                    if(dirtyOnly) {
                        if(entity.isDirty) {
                            self.drawEntity(entity);

                            entity.isDirty = false;
                            entity.oldDirtyRect = entity.dirtyRect;
                            entity.dirtyRect = null;
                        }
                    } else {
                        self.drawEntity(entity);
                    }
                }
            });
        },

        drawDirtyEntities: function() {
            this.drawEntities(true);
        },

        clearDirtyRect: function(r) {
            this.context.clearRect(r.x, r.y, r.w, r.h);
        },

        clearDirtyRects: function() {
            var self = this,
                count = 0;

            this.game.forEachVisibleEntityByDepth(function(entity) {
                if(entity.isDirty && entity.oldDirtyRect) {
                    self.clearDirtyRect(entity.oldDirtyRect);
                    count += 1;
                }
            });

            this.game.forEachAnimatedTile(function(tile) {
                if(tile.isDirty) {
                    self.clearDirtyRect(tile.dirtyRect);
                    count += 1;
                }
            });

            if(this.game.clearTarget && this.lastTargetPos) {
                var last = this.lastTargetPos,
                    rect = this.getTargetBoundingRect(last.x, last.y);

                this.clearDirtyRect(rect);
                this.game.clearTarget = false;
                count += 1;
            }

            if(count > 0) {
                //console.log("count:"+count);
            }
        },

        getEntityBoundingRect: function(entity) {
            var rect = {},
                s = this.scale,
                spr;

            if(entity instanceof Player && entity.hasWeapon()) {
                var weapon = this.game.sprites[entity.getWeaponName()];
                spr = weapon;
            } else {
                spr = entity.sprite;
            }

            if(spr) {
                rect.x = (entity.x + spr.offsetX - this.camera.x) * s;
                rect.y = (entity.y + spr.offsetY - this.camera.y) * s;
                rect.w = spr.width * s;
                rect.h = spr.height * s;
                rect.left = rect.x;
                rect.right = rect.x + rect.w;
                rect.top = rect.y;
                rect.bottom = rect.y + rect.h;
            }
            return rect;
        },

        getTileBoundingRect: function(tile) {
            var rect = {},
                gridW = this.game.map.width,
                s = this.scale,
                ts = this.tilesize,
                cellid = tile.index;

            rect.x = ((getX(cellid + 1, gridW) * ts) - this.camera.x) * s;
            rect.y = ((Math.floor(cellid / gridW) * ts) - this.camera.y) * s;
            rect.w = ts * s;
            rect.h = ts * s;
            rect.left = rect.x;
            rect.right = rect.x + rect.w;
            rect.top = rect.y;
            rect.bottom = rect.y + rect.h;

            return rect;
        },

        getTargetBoundingRect: function(x, y) {
            var rect = {},
                s = this.scale,
                ts = this.tilesize,
                tx = x || this.game.selectedX,
                ty = y || this.game.selectedY;

            rect.x = ((tx * ts) - this.camera.x) * s;
            rect.y = ((ty * ts) - this.camera.y) * s;
            rect.w = ts * s;
            rect.h = ts * s;
            rect.left = rect.x;
            rect.right = rect.x + rect.w;
            rect.top = rect.y;
            rect.bottom = rect.y + rect.h;

            return rect;
        },

        isIntersecting: function(rect1, rect2) {
            return !((rect2.left > rect1.right) ||
                     (rect2.right < rect1.left) ||
                     (rect2.top > rect1.bottom) ||
                     (rect2.bottom < rect1.top));
        },

        drawEntityName: function(entity) {
            this.context.save();

            if(entity.name && entity instanceof Player) {
                var color = (entity.id === this.game.playerId) ? "#fcda5c" : "white";
                var name = (entity.level) ? "lv." + entity.level + " " + entity.name : entity.name;
                this.drawText(name,
                              (entity.x + 8) * this.scale,
                              (entity.y + entity.nameOffsetY) * this.scale,
                              true,
                              color);
            }
            this.context.restore();
        },

        drawTerrain: function() {
            var self = this,
                m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

            this.game.forEachVisibleTile(function (id, index) {
                if(!m.isHighTile(id) && !m.isAnimatedTile(id)) { // Don't draw unnecessary tiles
                    self.drawTile(self.background, id, self.tileset, tilesetwidth, m.width, index);
                }
            }, 1);
        },

        drawAnimatedTiles: function(dirtyOnly) {
            var self = this,
                m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

            this.animatedTileCount = 0;
            this.game.forEachAnimatedTile(function (tile) {
                if(dirtyOnly) {
                    if(tile.isDirty) {
                        self.drawTile(self.context, tile.id, self.tileset, tilesetwidth, m.width, tile.index);
                        tile.isDirty = false;
                    }
                } else {
                    self.drawTile(self.context, tile.id, self.tileset, tilesetwidth, m.width, tile.index);
                    self.animatedTileCount += 1;
                }
            });
        },

        drawDirtyAnimatedTiles: function() {
            this.drawAnimatedTiles(true);
        },

        drawHighTiles: function(ctx) {
            var self = this,
                m = this.game.map,
                tilesetwidth = this.tileset.width / m.tilesize;

            this.highTileCount = 0;
            this.game.forEachVisibleTile(function (id, index) {
                if(m.isHighTile(id)) {
                    self.drawTile(ctx, id, self.tileset, tilesetwidth, m.width, index);
                    self.highTileCount += 1;
                }
            }, 1);
        },

        drawBackground: function(ctx, color) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        },

        drawFPS: function() {
            var nowTime = new Date(),
                diffTime = nowTime.getTime() - this.lastTime.getTime();

            if (diffTime >= 1000) {
                this.realFPS = this.frameCount;
                this.frameCount = 0;
                this.lastTime = nowTime;
            }
            this.frameCount++;

            //this.drawText("FPS: " + this.realFPS + " / " + this.maxFPS, 30, 30, false);
            this.drawText("FPS: " + this.realFPS, 30, 30, false);
        },

        drawDebugInfo: function() {
            if(this.isDebugInfoVisible) {
                this.drawFPS();
                //this.drawText("A: " + this.animatedTileCount, 100, 30, false);
                //this.drawText("H: " + this.highTileCount, 140, 30, false);
            }
        },

        drawCombatInfo: function() {
            var self = this;

            switch(this.scale) {
                case 2: this.setFontSize(20); break;
                case 3: this.setFontSize(30); break;
            }
            this.game.infoManager.forEachInfo(function(info) {
                self.context.save();
                self.context.globalAlpha = info.opacity;
                self.drawText(info.value, (info.x + 8) * self.scale, Math.floor(info.y * self.scale), true, info.fillColor, info.strokeColor);
                self.context.restore();
            });
            this.initFont();
        },

        drawItemInfo: function(){
            var self = this;
            var s = this.scale;
            var ds = this.upscaledRendering ? this.scale : 1;
            var os = this.upscaledRendering ? 1 : this.scale;

            this.context.save();
            this.context.translate(this.camera.x*s, this.camera.y*s);
            this.drawRectStroke(8, 8, 29, 4, "rgba(142, 214, 255, 0.8)");

            Types.forEachArmorKind(function(kind, kindName){
                var item = self.game.sprites[kindName];
                if(item){
                    var itemAnimData = item.animationData["idle_down"];
                    if(itemAnimData){
                        var ix = item.width * 0 * os,
                            iy = item.height * itemAnimData.row * os,
                            iw = item.width * os,
                            ih = item.height * os,
                            rank = Types.getArmorRank(kind);

                        if(rank > Types.getArmorRank(Types.Entities.SEADRAGONARMOR)){
                            return;
                        }
                        if(kind !== Types.Entities.ADMINARMOR){
                            self.context.drawImage(item.image, ix, iy, iw, ih,
                                item.offsetX * s + ((rank%19)*3+2)*self.tilesize,
                                item.offsetY * s + (Math.floor(rank/19)*3+2)*self.tilesize,
                                iw * ds, ih * ds);
                        }
                    }
                }
            });

            Types.forEachWeaponKind(function(kind, kindName){
                var item = self.game.sprites[kindName];
                if(item){
                    var itemAnimData = item.animationData["idle_down"];
                    if(itemAnimData){
                        var ix = item.width * 0 * os,
                            iy = item.height * itemAnimData.row * os,
                            iw = item.width * os,
                            ih = item.height * os,
                            rank = Types.getWeaponRank(kind);

                        if(rank > Types.getWeaponRank(Types.Entities.SEARAGE)){
                            return;
                        }

                        self.context.drawImage(item.image, ix, iy, iw, ih,
                                               item.offsetX * s + ((rank%19)*3+2)*self.tilesize,
                                               item.offsetY * s + (Math.floor(rank/19)*3+2)*self.tilesize,
                                               iw * ds, ih * ds);

                    }
                }
            });
            this.context.restore();
        },
        drawWallet: function(){
            var s = this.scale;
            var wallet = null;

            this.context.save();
            this.context.translate(this.camera.x*s, this.camera.y*s);

            if(this.game.player) {
                wallet = this.game.player.wallet;
                this.drawRect((this.camera.gridW-2)*this.tilesize*s,
                          0*this.tilesize*s,
                          2, 1, "rgba(0, 0, 0, 0.8)");
            }

            this._drawWallet(Types.Entities.TOKEN_A, 0);
            this._drawWallet(Types.Entities.TOKEN_B, 1);

            this.context.restore();
        },
        _drawWallet: function(key, index){
            var self = this;
            var s = this.scale;
            var ds = this.upscaledRendering ? this.scale : 1;
            var os = this.upscaledRendering ? 1 : this.scale;
            var wallet = null;

            if(this.game.player){
                wallet = this.game.player.wallet;
            }

            var itemKind = parseInt(key);
            var item = this.game.sprites["item-" + Types.getKindAsString(itemKind)];
            if(item){
                var itemAnimData = item.animationData["idle"];
                if(itemAnimData){
                    var ix = item.width * 0 * os,
                        iy = item.height * itemAnimData.row * os,
                        iw = item.width * os,
                        ih = item.height * os;
                    self.context.drawImage(item.image, ix, iy, iw, ih,
                                            item.offsetX * s + (this.camera.gridW-2+index)*self.tilesize*s,
                                            item.offsetY * s + 0*self.tilesize*s,
                                            iw * ds, ih * ds);
                    var color = "white";

                    var amount = 0;
                    if(wallet) {
                        amount = wallet[key];
                    }
                    self.drawText(amount.toString(),
                        (this.camera.gridW-2+index+0.5)*self.tilesize*s - amount.toString().length*self.tilesize*0.25,
                        1.2*self.tilesize*s, false, color);
                }
            }
        },
        drawInventory: function(){
            var s = this.scale;
            var inventory = null;

            this.context.save();
            this.context.translate(this.camera.x*s,
                                   this.camera.y*s);
            if(this.game.player){
                inventory = this.game.player.inventory;

                if(this.game.player.healingCoolTimeCallback === null){
                    this.drawRect((this.camera.gridW-inventory.length)*this.tilesize*s,
                              (this.camera.gridH-1)*this.tilesize*s,
                              inventory.length, 1, "rgba(0, 0, 0, 0.8)");
                } else {
                    this.drawRect((this.camera.gridW-inventory.length)*this.tilesize*s,
                              (this.camera.gridH-1)*this.tilesize*s,
                              inventory.length, 1, "rgba(255, 0, 0, 0.8)");
                }
    
                for(var i = 0; i < inventory.length; i++) {
                    if(this.game.menu && this.game.menu.inventoryOn === "inventory"+i){
                        this.drawRect((this.camera.gridW-inventory.length+i)*this.tilesize*s,
                                      (this.camera.gridH-1)*this.tilesize*s,
                                      1, 1, "rgba(0, 0, 255, 0.8)");
                        break;
                    }
                }
    
                for(var i = 0; i < inventory.length; i++) {
                    this._drawInventory(i);
                }
            }

            this.drawInventoryMenu();
            this.context.restore();
        },
        _drawInventory: function(i){
            var self = this;
            var s = this.scale;
            var ds = this.upscaledRendering ? this.scale : 1;
            var os = this.upscaledRendering ? 1 : this.scale;
            var inventory = null;

            if(this.game.player){
                inventory = this.game.player.inventory;
            }
            if(inventory && inventory[i]){
                var itemKind = inventory[i];
                var item = this.game.sprites["item-" + Types.getKindAsString(itemKind)];
                if(item){
                    var itemAnimData = item.animationData["idle"];
                    if(itemAnimData){
                        var ix = item.width * 0 * os,
                            iy = item.height * itemAnimData.row * os,
                            iw = item.width * os,
                            ih = item.height * os;
                        self.context.drawImage(item.image, ix, iy, iw, ih,
                                               item.offsetX * s + (this.camera.gridW-inventory.length+i)*self.tilesize*s,
                                               item.offsetY * s + (this.camera.gridH-1)*self.tilesize*s,
                                               iw * ds, ih * ds);
                        if(Types.isHealingItem(itemKind) || Types.isToken(itemKind)){
                            var color = "white";
                            if(i === this.game.healShortCut)
                                color = "lime";

                            self.drawText(this.game.player.inventoryCount[i].toString(),
                                (this.camera.gridW-inventory.length+i+0.5)*self.tilesize*s-this.game.player.inventoryCount[i].toString().length*self.tilesize*0.25,
                                (this.camera.gridH-1)*self.tilesize*s, false, color);
                        }
                    }
                }
            }
        },
        drawInventoryMenu: function(){
            var s = this.scale;
            if(this.game.menu && this.game.menu.inventoryOn){
                var inventoryNumber = -1;
                var inventory = this.game.player.inventory;
                for(var i = 0; i < inventory.length; i++) {
                    if(this.game.menu.inventoryOn === "inventory"+i) {
                        inventoryNumber = i;
                        break;
                    }
                }

                if(this.game.player.inventory[inventoryNumber] === Types.Entities.CAKE
                || this.game.player.inventory[inventoryNumber] === Types.Entities.CD){
                    this.drawRect((this.camera.gridW-2)*this.tilesize*s,
                                  (this.camera.gridH-2)*this.tilesize*s,
                                  2, 1, "rgba(0, 0, 0, 0.8)");
                    this.drawText("drop",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-1.4)*this.tilesize*s,
                                  true, "white", "black");
                } if(Types.isToken(this.game.player.inventory[inventoryNumber])) {
                    this.drawRect((this.camera.gridW-2)*this.tilesize*s,
                                  (this.camera.gridH-2)*this.tilesize*s,
                                  2, 1, "rgba(0, 0, 0, 0.8)");
                    this.drawText("drop",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-1.4)*this.tilesize*s,
                                  true, "white", "black");
                } else if(Types.isHealingItem(this.game.player.inventory[inventoryNumber])){
                    this.drawRect((this.camera.gridW-2)*this.tilesize*s,
                                  (this.camera.gridH-4)*this.tilesize*s,
                                  2, 3, "rgba(0, 0, 0, 0.8)");
                    this.drawText("set hotkey",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-3.4)*this.tilesize*s,
                                  true, "white", "black");
                    this.drawText("eat",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-2.4)*this.tilesize*s,
                                  true, "white", "black");
                    this.drawText("drop",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-1.4)*this.tilesize*s,
                                  true, "white", "black");
                } else{
                    this.drawRect((this.camera.gridW-2)*this.tilesize*s,
                                  (this.camera.gridH-4)*this.tilesize*s,
                                  2, 3, "rgba(0, 0, 0, 0.8)");
                    this.drawText("equip",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-3.4)*this.tilesize*s,
                                  true, "white", "black");
                    this.drawText("change avatar",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-2.4)*this.tilesize*s,
                                  true, "white", "black");
                    this.drawText("drop",
                                  (this.camera.gridW-1)*this.tilesize*s,
                                  (this.camera.gridH-1.4)*this.tilesize*s,
                                  true, "white", "black");
                }
            }
        },
        drawCoordination: function(){
            var self = this;
            var s = this.scale;

            this.context.save();
            this.context.translate(this.camera.x*s, this.camera.y*s);
            var color = "white";
            self.drawText(this.game.player.gridX.toString(),
                                (0.5)*self.tilesize*s-this.game.player.gridX.toString().length*self.tilesize*0.25,
                                (this.camera.gridH)*self.tilesize*s-5, false, color);
            self.drawText(this.game.player.gridY.toString(),
                                (1.5)*self.tilesize*s-this.game.player.gridY.toString().length*self.tilesize*0.25,
                                (this.camera.gridH)*self.tilesize*s-5, false, color);
            this.context.restore();
        },

        setCameraView: function(ctx) {
            ctx.translate(-this.camera.x * this.scale, -this.camera.y * this.scale);
        },

        clearScreen: function(ctx) {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        },

        getPlayerImage: function() {
            var canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d'),
                os = this.upscaledRendering ? 1 : this.scale,
                player = this.game.player,
                sprite = player.getArmorSprite(),
                spriteAnim = sprite.animationData["idle_down"],
                // character
                row = spriteAnim.row,
                w = sprite.width * os,
                h = sprite.height * os,
                y = row * h,
                // weapon
                weapon = this.game.sprites[this.game.player.getWeaponName()],
                ww = weapon.width * os,
                wh = weapon.height * os,
                wy = wh * row,
                offsetX = (weapon.offsetX - sprite.offsetX) * os,
                offsetY = (weapon.offsetY - sprite.offsetY) * os,
                // shadow
                shadow = this.game.shadows["small"],
                sw = shadow.width * os,
                sh = shadow.height * os,
                ox = -sprite.offsetX * os,
                oy = -sprite.offsetY * os;

            canvas.width = w;
            canvas.height = h;

            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(shadow.image, 0, 0, sw, sh, ox, oy, sw, sh);
            ctx.drawImage(sprite.image, 0, y, w, h, 0, 0, w, h);
            ctx.drawImage(weapon.image, 0, wy, ww, wh, offsetX, offsetY, ww, wh);

            return canvas.toDataURL("image/png");
        },

        renderStaticCanvases: function() {
            this.background.save();
            this.setCameraView(this.background);
            this.drawTerrain();
            this.background.restore();

            if(this.mobile || this.tablet) {
                this.clearScreen(this.foreground);
                this.foreground.save();
                this.setCameraView(this.foreground);
                this.drawHighTiles(this.foreground);
                this.foreground.restore();
            }
        },

        renderFrame: function() {
            if(this.mobile || this.tablet) {
                this.renderFrameMobile();
            }
            else {
                this.renderFrameDesktop();
            }
        },

        renderFrameDesktop: function() {
            this.clearScreen(this.context);

            this.context.save();
            this.setCameraView(this.context);
            this.drawAnimatedTiles();

            if(this.game.started && this.game.cursorVisible) {
                this.drawSelectedCell();
                this.drawTargetCell();
            }

            //this.drawOccupiedCells();
            this.drawPathingCells();
            this.drawEntities();
            this.drawCombatInfo();
            this.drawHighTiles(this.context);
            if(this.game.itemInfoOn) {
                this.drawItemInfo();
            }
            this.drawInventory();
            this.drawWallet();
            this.drawCoordination();
            this.context.restore();

            // Overlay UI elements
            if(this.game.cursorVisible)
                this.drawCursor();

            this.drawDebugInfo();
        },

        renderFrameMobile: function() {
            this.clearDirtyRects();
            this.preventFlickeringBug();

            this.context.save();
                this.setCameraView(this.context);

                this.drawDirtyAnimatedTiles();
                this.drawSelectedCell();
                this.drawDirtyEntities();
            this.context.restore();
        },

        preventFlickeringBug: function() {
            if(this.fixFlickeringTimer.isOver(this.game.currentTime)) {
                this.background.fillRect(0, 0, 0, 0);
                this.context.fillRect(0, 0, 0, 0);
                this.foreground.fillRect(0, 0, 0, 0);
            }
        }
    });

    var getX = function(id, w) {
        if(id == 0) {
            return 0;
        }
        return (id % w == 0) ? w - 1 : (id % w) - 1;
    };

    return Renderer;
});
